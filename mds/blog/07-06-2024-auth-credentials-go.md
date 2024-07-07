# Authentication made simple, for the web (and more)

## Preface

I spent a fair amount of time understanding that the general concept of authentication is not really complicated. I decided to write this blog post in the hope that will help you conquer this topic. I know '*from scratch*' sounds scary, but it's really simple, try to follow this and you will have a good start for a solid authentication system.

I am not going to cover OAuth in this post nor Authorization, i'll cover only **Authentication** using your own credentials.

The main resource that I recommend and where I got all my 'little' but good knowledge about the topic is **[The Copenhagen Book](https://thecopenhagenbook.com/)**

This is a high-level approach where I go into the details of what I understood and how I implemented it. All the code shown should be considered pseudo code, so you need to adapt it based on your needs.

## Overview

One of the main approach and what I used for my last website is a server-side token based one, stored as a cookie in the web browser.

The high-level auth flow is shown in this beautiful piece of art mouse-drawn by me, is splitted in two parts and doesn't show what happens when something goes wrong.

### Registration

![auth-flow-registration](https://imgur.com/7Fntsv4.png)

### Login

![auth-flow-login](https://imgur.com/89asKhB.png)

## Basic idea and setup

I'll show you how can you achieve that in the following sections!
The general idea is:
- Create a new session whenever a user signs in
- Use the session to authenticate/retrieve the current user
- The user need to be stored with the hashed password (hashed using a specific algorithm/standard) when creating an account
- Follow web security best practices

### Database

you need a user table and a session table like this:

~~~sql
CREATE TABLE session (
	token STRING NOT NULL UNIQUE,
	expires_at INTEGER NOT NULL,
	user_id INTEGER NOT NULL,

	FOREIGN KEY (user_id) REFERENCES user(id)
)
~~~

~~~sql
CREATE TABLE user (
	id BIGINT PRIMARY KEY,
	username STRING NOT NULL,
	password INTEGER NOT NULL,
)
~~~

### Backend logic

I remind you again that <ins>this is highly personal, is a pseudo-code and depends how you structure your code.</ins>

~~~go
type User struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"`
}

func createOrLoginUser(user User) {
    uid := user.ID

    // Check if the user already exists
    // if yes create the session (used by the browser to get the current user from session_id cookie)
    if isUserExisting(uid) {
        createSession(uid)
    } else { // else create the account and a new session
        createUser(user)
        createSession(uid)
    }
}
~~~

The basics steps are these ones, more or less, but you could say that's too easy...and I say again, yes it is.

Now let's expand a little bit the user account creation:

~~~go
func createUser(user User) {
    // Hash the password
    pw := hashPassword(user.Password)

    // Insert the user into the database
    "INSERT INTO user(id, username, password) VALUES (...)"
}
~~~

really really basic.

## Session

The session need to be created (both database and cookies) and also validated!

~~~go
type Session struct {
	Token     string `json:"token"`
	ExpiresAt int    `json:"expires_at"`
	UserID    int64  `json:"user_id"`
}

func createSession(user_id uint64) {
	session := &Session{
		Token:     generateSessionToken(),
		ExpiresAt: EXPIRE_TIME,
		UserID:    user_id,
	}
    
    "INSERT INTO sessions(token, expires_at, user_id) VALUES (...)"
    
    setCookie(session)
}

func generateSessionToken() string {
    // Generating and encoding session token using cryptography
    bytes := make([]byte, 15)
	rand.Read(bytes)
	sessionId := base32.StdEncoding.EncodeToString(bytes)
	return sessionId
}

func validateSession(session_id string) (*Session, error) {
	s, ok := getSessionFromStorage(session_id)
	if !ok {
		return nil, errors.New("invalid session id")
	}
	if time.Now().After(s.ExpiresAt) {
		return nil, errors.New("expired session")
	}
	return s, nil
}
~~~

The token must be generated using a *cryptographically secure random generator* and must be case-sensitive (generally). For more secure token storing you should be hashing it using SHA-256.

The session lifetime (EXPIRE_TIME) is important for security reasons. If you are creating a social or other non security-critical apps, then you are fine with something between 20-30 days, otherwise the session should expire whenever the user leaves the app to prevent **session hijacking**. And the session should also be invalidated/deleted whenever a user signs out.

### Cookie for the session
So to tell the browser if you are authenticated or not, even after you close it, we must use something persistent, because HTTP is stateless. One of the many approach, and the most used one on the web, is with cookies.

Cookies are basically key-value pair informations, that the website needs to keep track, stored inside the 'browser memory'.

Session cookies should have the following attributes:

- **HttpOnly** — Cookies are only accessible server-side.
- **SameSite=Lax** — Cookies will be sent on some cross-site. requests e.g. if the request uses a safe HTTP method like 'GET'.
- **Secure** — Cookies can only be sent over HTTPS.
- **Max-Age** or Expires — When the cookie expires.
- **Path="/"** — Cookies can be accessed from all routes.

We basically set the session cookie server-side (backend) and access it in the frontend.

Some notes:
- 'cross-site requests' are the requests that you send between the frontend and backend if they are hosted on different urls
- Use 'SameSite=Strict' for critical websites
- DON'T send cookies inside URLs as query params
- DON'T send cookies inside form data
- DON'T store session ids inside localStorage or sessionStorage (even if the name is 'session storage'). 

### CORS
Cross Origin Resource Sharing, short for:"you can decided which origins (domain,scheme or port) other than your own, should permit loading resources (also called cross-site requests)", is a mechanism based on HTTP headers.

In tutorials you always see: 

~~~js
Access-Control-Allow-Origin: *
~~~

and try to guess, this is a way to kill all the purpose of CORS. You are allowing every origin, even malicious ones, and no no no, you little lazy web-dev, you know that's bad.

If you want to go deeper and read more go on [mdn CORS docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

## Hashing the password

Let's talk a bit about passwords. They are as important as they are easy to create, you just type random characters, sometimes followed by special characters, right? But without hashing them, the risks are much higher.

Passwords should be 'salted' and 'hashed' before storing them in the database.

Some early recommendations before talking about these 2 terms are:
- The password should be at least 8 chars long
- All valid unicode chars should be allowed, including whitespace
- Use [zxcvbn](https://github.com/dropbox/zxcvbn) for weak password
- Detect leak password using [haveibeenpawned](https://haveibeenpwned.com/API/v3)

### Salting

Salting is a common technique to add random values to each password before hashing to prevent brute force attacks.

The flow consists of

~~~go
salt = randomValues()
hash = hashPassword(password + salt) + salt
~~~

### Argon2id hashing

This is one of the strongest and most recommended way to hash the password, you can read more [here](https://argon2-cffi.readthedocs.io/en/stable/argon2.html) and generally just search on google to find more resources.

**Hashing** is used to generate a unique representation of the input, so the same input will give the same hash, but it's not reversible unlike 'encryption'.

Even if you see that MD5, SHA-1 and SHA-256 are popular for hashing, do not use these methods for password, it's better to choose something else more specific (like argon).

**Argon** has 3 variants (Argon2, Argon2i and Argon2id) but for password it's preferable to use Argon2id, the hybrid one.
Argon algorithm accepts various parameters:

- **Memory** — The amount of memory used by the algorithm (in [kibibytes](https://www.logicmonitor.com/blog/what-the-hell-is-a-kibibyte)).
- **Iterations** — The number of iterations (or passes) over the memory.
- **Parallelism** — The number of threads (or lanes) used by the algorithm.
- **Salt length** — Length of the random salt. 16 bytes is recommended for password hashing.
- **Key length** — Length of the generated key (or password hash). 16 bytes or more is recommended.

Memory and Iterations controls the computational and time cost of hashing, so more cost, more expensive it is and more difficult is for the hacker to guess the password. For login or registration, while processing the hash, it's better to not surpass the 500ms runtime threshold for a good UX.

Before moving to the code example, a few more notes for an effective UX:
- Error messages needs to be vague ("incorrect username OR password", not individual error messages)
- Don't prevent users from copy-pasting passwords, as it discourages users from using password managers like bitwarden (really good I recommend it)
- Ask the current password when a user attempts to change their password

~~~go
// Go specific example, remember no error checking is present 
// in these snippets because it' still pseudo code
// but you should ALWAYS perform error check.
import (
	"crypto/subtle"
	"golang.org/x/crypto/argon2"
)

type ArgonParams struct {
	version     int
	memory      uint32
	iterations  uint32
	parallelism uint8
	length      uint32
}

// Not required for the flow because we will not use the hashing here
// new_hashed_password := hashPassword(new_password)

stored_encoded_password := getStoredPassword()

check := verifyPassword(new_password, stored_hashed_password)

~~~

Now when using argon2id the standard way to store the password, IS NOT TO STORE THE HASHED version directly, but instead you should store an encoded representation of the hashed password in the following format:

~~~js
$argon2id$v=19$m=<memory>,t=<iterations>,p=$<base64-salt>$<base64-hash>
~~~

~~~go
func generateEncodedPassword(pw string) (string) {
    // Recommended minimum argon parameters
	var p ArgonParams = ArgonParams{
		version:     19,
		memory:      19 * 1024,
		iterations:  2,
		parallelism: 1,
		length:      32,
	}

	salt := generateSalt(16)

	hash := argon2.IDKey([]byte(pw), salt, p.iterations, p.memory, p.parallelism, p.length)

	b64s := base64.RawStdEncoding.EncodeToString(salt)
	b64h := base64.RawStdEncoding.EncodeToString(hash)

	encoded_hash := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s", p.version, p.memory, p.iterations, p.parallelism, b64s, b64h)

	return encoded_hash
}
~~~

And to verify the password there are these few steps:
1) Extract the salt and parameters from the encoded password hash stored in the database.
2) Derive the hash of the plaintext password using the exact same Argon2 variant, version, salt and parameters.
3) Check whether this new hash is the same as the original one.

~~~go
func verifyPassword(password string, stored_hashed_password string) (bool) {
    var p ArgonParams = ArgonParams{
        version:     19,
        memory:      19 * 1024,
        iterations:  2,
        parallelism: 1,
        length:      32,
    }

    p, salt, stored_hash := decodeHash(stored_hashed_password)
    
    new_hash := argon2.IDKey([]byte(password), salt, p.iterations, p.memory, p.parallelism, p.length)

    if (subtle.ConstantTimeCompare(stored_hash, new_hash)) {
        // The password is valid!
    }
}

func decodeHash(encoded_hash string) (*ArgonParams, []byte, []byte) {
    // Process the formatted $argon2id$v... hashed password
    // And get the individual parameters
}
~~~

## Extra: Security and vulnerability attacks

I mentioned 'session hijacking' before, what's that?

The topic is *authentication*, and when you need to authenticate to something, it usually involves something of high value, which implies a risk of theft. That's why we use hashing and other security techniques to prevent attacks by hackers, such as CSRF and session hijacking.

### CSRF

**Cross Site Request Forgivery** attacks consists of an attacker that makes authenticated requests on behalf of users when credentials are stored for example in cookies and are sent all over the different origins.

It can be prevented by only accepting POST and POST-like (PUT, DELETE) requests made by browsers from a trusted origin.

Most modern languages and framework should provide some sort of out-of-the-box CSRF protection, otherwise, just create the mechanism from scratch by using a token approach (read more [there](https://thecopenhagenbook.com/csrf)).

![auth-csrf](https://imgur.com/bF3ywss.png)

### Session hijacking

**Session hijacking** as the word says, it's basically the exploitation of the web session control mechanism that we talked before, which is managed by a session token. The hacker sniff the token and use it to authenticate on behalf the user!

The most common ways to compromise session token are:
- Predictable session token
- Session sniffing
- Client-side attacks (e.g. XSS)
- Man in the middle attack

![auth-session-hijacking](https://imgur.com/NIZFlES.png)

### OWASP

A good way to learn about popular vulnerabilities is from [OWASP](https://owasp.org/www-project-top-ten/).

## Final

I hope that you enjoyed reading this post, feel free to dm me on [X](https://x.com/graffioh) or [Discord](http://discordapp.com/users/165500587109122049) if you need some help, but if you follow this article everything should be clear.

I applied these things that I wrote in my most recent project, a simple social network called [hivemind](https://github.com/Graffioh/hivemind).

See you in the wired!

![the-wired-lain](https://images.squarespace-cdn.com/content/v1/57825361440243db4a4b7830/1641020346561-V6C6CG803L98OUQAOL3H/serial-experiments+-lain-anime-manga-dystopianmanga-cyber-punk-manga-cyberpunk-anime-darkanime-dark-ghostintheshell-vaporwave-RyutaroNakamura-YoshitoshiABe-ChiakiJKonaka)