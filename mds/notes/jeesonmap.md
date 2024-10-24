# JSON parser that convert the given string in an hashmap/dictionary (Java)

### chatgpt guidance

Building a JSON parser is a great project to understand how data formats and parsers work. Here’s an in-depth explanation of each step mentioned, which will help you get started with building your own JSON parser from scratch:

#### 1. **Understand the JSON Specification**
   - JSON (JavaScript Object Notation) is a lightweight data-interchange format. It's easy for humans to read and write, and easy for machines to parse and generate.
   - JSON data types include:
     - **Objects**: Key-value pairs enclosed in curly braces `{}`.
     - **Arrays**: Ordered lists of values enclosed in square brackets `[]`.
     - **Strings**: Enclosed in double quotes `" "`.
     - **Numbers**: Can be integers or floating-point numbers.
     - **Booleans**: Represented as `true` or `false`.
     - **Null**: Represented as `null`.
   - Familiarize yourself with the [JSON specification](https://www.json.org/json-en.html), which defines how JSON data is structured and what rules must be followed.

#### 2. **Create a Tokenizer (Lexical Analysis)**
   - A tokenizer breaks down the JSON string into smaller units called tokens. Each token represents a meaningful element like a curly brace, a colon, a string, a number, or a boolean.
   - For example, given the JSON string:
     ```json
     {"name": "John", "age": 30}
     ```
     The tokenizer will produce tokens such as `{`, `"name"`, `:`, `"John"`, `,`, `"age"`, `:`, `30`, `}`.
   - Tools like **Lex** (a lexical analyzer generator) can be used to automate this process. Lex allows you to define patterns for each type of token (e.g., patterns for strings, numbers, and special characters like `{`, `}`, `:`).
   - If you prefer, you can manually code the tokenizer using regular expressions to match and extract tokens.

#### 3. **Define the JSON Grammar Using Yacc (Parser)**
   - After tokenization, you need to parse the tokens to understand the structure of the JSON data. This is called **syntax analysis**.
   - **Yacc** (Yet Another Compiler Compiler) helps define grammar rules that describe how different types of tokens can be combined to form valid JSON structures.
   - For instance:
     - A JSON object can be defined as `{}` or `{ members }`, where `members` is a list of key-value pairs.
     - A key-value pair can be defined as `"string" : value`, where `value` could be a string, number, array, object, boolean, or null.
   - Yacc uses these rules to create a **parse tree**, which represents the hierarchical structure of the JSON data.
   - If Yacc seems complicated, you can also manually code the parser by implementing a recursive descent parser based on the grammar rules.

#### 4. **Handle Errors and Pretty Print**
   - JSON parsers should be able to handle errors gracefully. For example, if the input is malformed (e.g., missing a comma, unmatched braces), the parser should detect it and report an error.
   - It is helpful to provide error messages that include the location in the string where the error was found. This involves tracking the line number and character position.
   - You can also add features like pretty-printing the JSON output to make it more readable by formatting it with proper indentation and line breaks.

#### 5. **Construct the Language-Native Object**
   - The final step is to convert the parse tree (or the parsed data structure) into a language-native object such as a dictionary in Python, a hash map in Java, or an object in JavaScript.
   - This typically involves walking through the parse tree and creating corresponding data structures in the programming language you're using.
   - For example, a JSON object would be converted to a dictionary in Python:
     ```python
     {"name": "John", "age": 30}  # Becomes a Python dictionary: {"name": "John", "age": 30}
     ```
   - This step ensures that your parser not only reads the JSON data but also creates a usable data structure that your program can interact with.

#### Tools You Might Use
- **Lex/Yacc (Flex/Bison)**: These are tools for lexical analysis and parsing, respectively. If you choose to use them, you'll need to learn how to write patterns for Lex and grammar rules for Yacc.
- **Regular Expressions**: For building your own tokenizer.
- **Programming Languages**: Implement the parser in any language, but languages with good support for text processing like Python, C++, or JavaScript can make this easier.

#### Learning Resources
- [JSON.org](https://www.json.org/json-en.html) for the JSON specification.
- Tutorials on **Lex and Yacc** (or Flex and Bison, their GNU versions) if you choose to use these tools.
- Basic concepts in **compilers**, including lexical and syntax analysis, will give you a foundation for understanding how tokenizers and parsers work.

Building a JSON parser from scratch will deepen your understanding of parsing techniques and give you a glimpse into how popular libraries like `json` in Python or `JSON.parse` in JavaScript are implemented.

## JSON Specification

- [json.org](https://www.json.org/json-en.html)

### object

name/value pairs

~~~json
{ name1: value1, name2: value2 }
~~~

![object-json-img](https://www.json.org/img/object.png)

### array

~~~json
[ value1, value2 ]
~~~

![array-json-img](https://www.json.org/img/array.png)

### value

~~~json
"string" 
number 
{object} 
[array]
true
false
null
~~~

![value-json-img](https://www.json.org/img/value.png)

### string

sequence of zero or more unicode characters wrapped in double quotes using backslash escapes

very much like C or Java string

![string-json-img](https://www.json.org/img/string.png)

### number

like a C or Java number, except that octal and hexadecimal formats are not used

![number-json-img](https://www.json.org/img/number.png)

### whitespace

can be inserted between any pair of tokens

![whitespace-json-img](https://www.json.org/img/whitespace.png)

## Lexer and Syntax

- [Guide to lex and yacc](https://arcb.csc.ncsu.edu/~mueller/codeopt/codeopt00/y_man.pdf)
- [JFlex and Jacc together](https://dev.to/vicentemaldonado/use-jflex-and-jacc-together-3nnd)

![compilation-sequence-img](https://imgur.com/quJeqb8.jpg)

- **lexer** -> recognize words ([regular grammars](https://en.wikipedia.org/wiki/Regular_grammar))
- **parser** -> recognize whole sentences ([context-free grammars](https://en.wikipedia.org/wiki/Context-free_grammar))

first you a lexer to recognize words (tokens) and pass those words to a parser which is able to determine if the words form a valid sentence

#### chatgpt

- **Lexer** (Lexical Analyzer):  
   The lexer is responsible for breaking the input text into a sequence of tokens (which can be thought of as words). It uses **regular grammars** to recognize patterns like keywords, numbers, identifiers, etc. Regular grammars are typically sufficient for this task because token structures are relatively simple.
- **Parser** (Syntax Analyzer):  
   The parser takes the tokens produced by the lexer and analyzes their structure according to the rules of a grammar, typically a **context-free grammar** (CFG). The parser checks whether the token sequence forms a valid sentence (i.e., a syntactically correct construct) in the language being analyzed.


### Lex (JFlex for java)

- [JFlex](https://www.jflex.de/)

#### theory

using regex we can specify patterns to lex that allow it to scan and match strings in the input

each pattern has an associated action, an action returns a token

regex are translated by lex to a program that mimics an FSA (finite state automata)

so lex is a compiler (a lexer)

the next state is determined by indexing into a state table considering *next input character* and *current state*

lex cannot be used to recognize nested structure such as parentheses (handled by using a stack, leetcode style) because it has only states and transitions between states

yacc augments an FSA with a stack

lex is good at pattern matching (lexing) and yacc si appropriate for more challenging tasks such as nested structures (parsing)

#### practice

~~~
... definitions ...
%%
... rules ...
%%
... subroutines ... 
~~~

input is copied to output, one character at a time

the first %% always required (rules section)

if no rules are specified then the default action is to match everything and copy it to output

stdin (input) and stdout (output)

example:

~~~c
%%
	/* ECHO is an optional action (macro) */
	/* match everything except newline */
. ECHO;

	/* match newline */
\n ECHO;

%%

int yywrap(void) {
	return 1;
}

int main(void) {
	yylex();
	return 0;
}
~~~

each pattern must begin in column one

anything not in column one is copied verbatim to the generated C file, that's why comments will not be counted as statements to execute

*yywrap* called by lex when input is exhausted

return 1 if done or 0 if more processing is required

*yylex* is the main entry-point for lex and return token

other predefined variables:

![lex-predefined-var-img](https://imgur.com/LKMFj9p.jpg)

this code prepends line numbers to each line in a file

~~~c
	/* substitutions */
digit [0-9]
letter [A-Za-z]

	/* code */
%{
	int yylineno;
%}
%%
^(.*)\n printf("%4d\t%s", ++yylineno, yytext);
	/* every time a letter is matched, increment counter */
{letter}* ++yylineno
%%

int main(int argc, char *argv[]) {
	yyin = fopen(argv[1], "r");
	yylex();
	fclose(yyin);
}
~~~

this is a wc simil implementation:

~~~c
%{
int nchar, nword, nline;
%}
%%
\n { nline++; nchar++; }
[^ \t\n]+ { nword++, nchar += yyleng; }
. { nchar++; }
%%

int main(void) {
	yylex();
	printf("%d\t%d\t%d\n", nchar, nword, nline);
	return 0;
}
~~~

### Yacc (Jacc for java)

- [Jacc](http://web.cecs.pdx.edu/~mpj/jacc/)

#### installation (macos)

- brew install ant
- download [source code](https://github.com/zipwith/jacc)
- in the jacc root dir, run: ant
- cp scripts/jacc /usr/local/bin/
- sudo mkdir -p /usr/local/lib/jacc
- sudo mv dist/jacc.jar /usr/local/lib/jacc/
- run: ant clean
- add to env variables: export JACC_PATH=/path/to/directory/containing/jacc.jar

#### theory 

this grammar specifies that an expression may be the sum of two expressions, the product of two expressions or an identifier:

~~~py
rule1 E -> E + E
rule2 E -> E * E
rule3 E -> id
~~~

lhs (left-hand side) terms are called *nonterminals* (expressions)\
terms such as id are called *terminals* (tokens returned by lex)

with this grammar we can generate expressions such as:

~~~py
E -> E * E       (rule2)
  -> E * z       (rule3)
  -> E + E * z   (rule1)
  -> E + y * z   (rule3)
  -> x + y * z   (rule3)
~~~

at each step we expanded the terms and applied different rules

to parse an expression we need to reduce the expression to a since nonterminal (*bottom-up* or *shift-reduce* parsing), uses a stack for storing terms

this is the same derivation but in reverse order:

~~~py
1   . x + y * z   shift
2   x . + y * z   reduce(r3)
3   E . + y * z   shift
4   E + . y * z   shift
5   E + y . * z   reduce(r3)
6   E + E . * z   shift
7   E + E * . z   shift
8   E + E * z .   reduce(r3)
9   E + E * E .   reduce(r2) emit multiply
10  E + E .       reduce(r1) emit add
11  E .           accept
~~~

terms to the left of the dot are on the stack

while remaining input is to the right of the dot

we start shifting tokens onto the stack and when the top of the stack matches the rhs of a production, we replace the matched tokens on the stack with the lhs of the production

conceptually the matched tokens (*handle*) of the rhx are popped off the stack and the lhs of the production is pushed on the stack

at step 6 we could have reduced instead of shifting, but this would result in addition having higher precedence than multiplication, also known as a *shift-reduce* conflict, the grammar is *ambiguous* since more than one possible derivation will yield the expression

#### practice





