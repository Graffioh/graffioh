# the argon wrath (go)

so tried to implement password verification with argon but failed miserably so found this [blog post](https://www.alexedwards.net/blog/how-to-hash-and-verify-passwords-with-argon2-in-go#:~:text=Verifying%20Passwords,-The%20final%20aspect&text=In%20essence%2C%20the%20steps%20to,same%20as%20the%20original%20one.) and started reading it

even if argon has 3 variants, for password hashing it's preferably to use **Argo2id** (hybrid of Argon2d and Argon2i)

the argon algo accepts various parameters:

- **Memory** — The amount of memory used by the algorithm (in kibibytes).
- **Iterations** — The number of iterations (or passes) over the memory.
- **Parallelism** — The number of threads (or lanes) used by the algorithm.
- **Salt length** — Length of the random salt. 16 bytes is recommended for password hashing.
- **Key length** — Length of the generated key (or password hash). 16 bytes or more is recommended.

memory and iterations control the computational cost (and time cost) of hashing, more cost more difficult is for the hacker to guess the password

for login/signup hashing, it's better for ux to have a runtime less than 500ms

formally argon2 is a key-derivation func, so the key that is produced is our hashed password

now with a random salt everytime a different hashed password will appear (with the same string)

to store the password the standard way is to create an encoded rep of the hashed password which looks like this:

$argon2id$v=19$m=\<memory>,t=\<iterations>,p=<parallelism>$\<base64-salt>$\<base64-hash>

in my case:\
$argon2id$v=19$m=19456,t=2,p=1$...$...

to **verify the password** there are a few steps:
- Extract the salt and parameters from the encoded password hash stored in the database.
- Derive the hash of the plaintext password using the exact same Argon2 variant, version, salt and parameters.
- Check whether this new hash is the same as the original one.

i implemented everything like the article suggested and it actually work.

feels good

![bojji](https://m.media-amazon.com/images/M/MV5BMzc0NTgxMTMtMmIzMS00ZmJhLWI5NjItZGNlN2Y1ZDM1YmUxXkEyXkFqcGdeQVRoaXJkUGFydHlJbmdlc3Rpb25Xb3JrZmxvdw@@._V1_.jpg)

# password auth best practices

still reading [The Copenhagen Book](https://thecopenhagenbook.com)

- at least 8 chars long
- all valid unicode chars should be allowed, including whitespace
- use [zxcvbn](https://github.com/dropbox/zxcvbn) for weak password
- detect leak password using [haveibeenpawned](https://haveibeenpwned.com/API/v3)

passwords must be salted and hased before storage.

**argon2id** with salting is recommended

hashing is to generate a unique representation of the input, so same input same hash...it's not reversible unlike encryption

recommended to not use MD5, SHA-1 and SHA-256 for password

**salting** is a common technique to add random values to each password before hashing to prevent brute force attacks

```go
salt = randomValues()
hash = hashPassword(password + salt) + salt
```

when comparing password hashes use constant time comparison instead of "==", to ensure protection against time-based attacks (where an attacker can extract infos using how long it took to compare the password with the hash lol)

the standard way should be with argon2id, scrypt and bcrypt:

```go
import (
	"crypto/subtle"
	"golang.org/x/crypto/argon2"
)

var storedHash []byte
var password []byte
hash := argon2.IDKey(password, salt, 2, 19*1024, 1, 32)

if (subtle.ConstantTimeCompare(hash, storedHash)) {
	// Valid password.
}
```

argon2id recommended minimum parameters

- **memorySize**: 19456 (19MB)
- **iterations**: 2
- **parallelism**: 1
- **optional**: use secret parameter

scrypt recommended minimum parameters

- **N**: 16384
- **P**: 16
- **r**: 1
- **dkLen**: 64

bcrypt **work factor** should be minimum 10

**MFA** is the best defense against brute-force attacks

a good rule of thumb is that error messages needs to be vague like "incorrect username or password", not "incorrect username" or "incorrect password".

for ux perspective it's more user friendly with targeted error messages, ofc

- don't prevent users from copy-pasting password as it discourages users from using password managers (clever)
- ask the current password when a user attempts to change their password
- [open redirect](https://thecopenhagenbook.com/open-redirect)

# basic auth from scratch (sort of)

[The Copenhagen Book](https://thecopenhagenbook.com) by the creator of Lucia-auth ([pilcrow](https://x.com/pilcrowonpaper))

store a **token** on the server

```sql
CREATE TABLE token (
	token STRING NOT NULL UNIQUE,
	expires_at INTEGER NOT NULL,
	user_id INTEGER NOT NULL,

	FOREIGN KEY (user_id) REFERENCES user(id)
)
```

where this token should be for example a **session for auth** and should be stored as a cookie

using this session cookie we can everytime retrieve (if present) user infos thanks to user_id foreign key

token must be **generated using a cryptographically secure random generator** and must be case-sensitive (generally)

```go
import (
	"crypto/rand"
	"encoding/base32"
)

bytes := make([]byte, 15)
rand.Read(bytes)
sessionId := base32.StdEncoding.EncodeToString(bytes)
```

if you need to store tokens that require an extra level of security (password reset tokens), there should be hashing using SHA-256

a new session with a session_id should be created whenever a user signs in

you could also implement sessions for non-authenticated users

the **session lifetime** is important for security reasons

for security-critical apps, the session should expire automatically and should match how long the user is expected to use the app in a single sitting, to prevent **session hijacking** (stealing a session)

for a social app tho, a good practice is to set the expiration time to a reasonable value, like 30 days

```go
func validateSession(sessionId string) (*Session, error) {
	session, ok := getSessionFromStorage(sessionId)
	if !ok {
		return nil, errors.New("invalid session id")
	}
	if time.Now().After(session.ExpiresAt) {
		return nil, errors.New("expired session")
	}
	return session, nil
}
```

sessions should be _invalidated_ whenever a user signs out (delete from db and cookies)

session cookies should have the following attributes:

- **HttpOnly**: Cookies are only accessible server-side
- **SameSite=Lax**: Use Strict for critical websites
- **Secure**: Cookies can only be sent over HTTPS
- **Max-Age** or Expires: Must be defined to persist cookies
- **Path=/**: Cookies can be accessed from all routes

when using cookies **CSRF protection** must be implemented

CSRF attacks consists of an attacker that makes authenticated requests on behalf of users when credentials are stored in cookies

_CSRF can be prevented by only accepting POST and POST-like (PUT, DELETE) requests made by browsers from a trusted origin_

use CORS in a strict way and check **Origin header** for non-GET requests

```go
func handleRequest(w http.ResponseWriter, request *http.Request) {
  	if request.Method != "GET" {
		originHeader := request.Header.Get()

		if originHeader != "https://example.com" {
			// Invalid request origin
			w.WriteHeader(403)
			return
		}
  	}
  	// ...
}
```

(the origin header has been supported by all modern browsers since around 2020, chrome and safari even before 2020)

SameSite=Lax is recommended, it will only be sent on cross-site requests if the request uses a safe HTTP method such as GET (it's crucial that the app doesn't use GET requests for modifying resources when using Lax (who does that?))

SameSite flag determines when the browser includes the cookie in requests

<u>DON'T send cookies inside URLs as query params or inside form data, DON'T store session ids inside localStorage or sessionStorage</u>
