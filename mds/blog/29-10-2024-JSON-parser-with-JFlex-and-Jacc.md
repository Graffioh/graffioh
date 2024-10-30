# Writing a JSON Parser using JFlex and Jacc (Java)

While doom-scrolling on **X** the everything app, I stumbled on [this post](https://x.com/arpit_bhayani/status/1848931553281450419):

![x-post-screenshot](https://imgur.com/EdehlHv.jpg)

I accepted the challenge to have some fun and learn new things.

I didn’t have any prior experience with compilers and I chose to do this in Java to brush up on my Java skills before my Amazon internship next year, since many of their microservices are written in it. 

In reality I didn’t end up brushing up on much Java at all.

## JSON Specification

Let's start with reading and understanding the JSON specification.

The main components are:
- object
- array
- value
- string
- number
- whitespaces

a JSON could be an object containing key/value pairs or an array of objects.

The key must be enclosed in double quotes " and whitespaces are not relevant.

To learn more about specific components and how they need to be **parsed** (more on this word later 😏) go read [this brief JSON introduction](https://www.json.org/json-en.html).

## Lexer and Parser

![compilation-sequence-img](https://imgur.com/quJeqb8.jpg)

This is a typical compilation sequence, but what do we need this for?

Parsing a JSON is a process of deserialization (*lexical analysis*) and interpretation (*syntax analysis*), but during the syntax analysis the Hashmap will be generated, so there is no extra steps as shown in the compilation sequence above.

Now let's talk about these two steps:

1) Lexical analysis: this is done by a **Lexer**, it consists of tokenizing the string (split the string into tokens) by identifying and extracting each item as a meaningful unit (the *token*).
2) Syntax analysis: this is done by a **Parser**, it consists of interpreting a series of tokens that put together have a meaning, so called a *structured representation* (where you basically build your Hashmap)

Now I'm gonna explain how I built the JSON Lexer and Parser with the help of [this guide](https://arcb.csc.ncsu.edu/~mueller/codeopt/codeopt00/y_man.pdf) and Claude.

You can also read my notes about Lex and Yacc [here](https://graffioh.com/notes/note/jeesonmap), which I recommend for additional context on the underlying theory.

## Building the Lexer with JFlex

[JFlex](https://www.jflex.de/) is based upon Lex, a computer program that generates lexers.

It has its own syntax and and it needs to be structured as follows:

~~~py
... definitions ...
%%
... rules ...
%%
... subroutines ... 
~~~

### The code

#### Definitions

Here we basically put the package and all the imports needed

~~~java
package org.jeesonmap;
import java.io.*;
~~~

#### Rules

The rules section defines the main part of the lexer, including the `JeesonLexer` class and the patterns (using regular expressions) used to identify tokens:

~~~java
%class JeesonLexer
%implements JeesonParserTokens
~~~

Here, we define the lexer class name and specify that it implements the `JeesonParserTokens` interface, which contains all tokens as an enumeration.

~~~java
%function yylex
%int

%{
private int token;
private String semantic;

/* get the current token code*/
public int getToken()
{
    return token;
}
/* get the current token value */
public String getSemantic()
{
    return semantic;
}

/* get the next token code */
public int nextToken()
{
    try
    {
        token = yylex();
    }
    catch (java.io.IOException e)
    {
        System.out.println(
            "IO exception occured:\n" + e);
    }
    return token;
}

public int getLine() {
    return yyline + 1;
}

public int getColumn() {
    return yycolumn + 1;
}
%}

%line
%column
~~~

Last but not least, we define several functions needed to make the lexer work:

- `getToken()` and `getSemantic()`, which return the current token’s ID (as an int) and its semantic value (as a String).

- `nextToken()`, which uses the main `yylex()` method to retrieve the next token. `yylex()` is the core function of the lexer, responsible for reading the input and returning a token code that corresponds to the next token identified in the input.

- `getLine()` and `getColumn()` are helper functions to provide the line and column numbers of the current token, which are useful for error handling.

~~~java
open_bracket = \{
string = \"([^\"\\\\]|\\\\[\"\\\\bfnrt])*\"
number = [0-9]+
double_dots = :
comma = ,
open_square = \[
closed_square = \]
boolean = true|false
null = null
closed_bracket = \}
unquoted_key = [a-zA-Z][a-zA-Z0-9_]*[ \t]*:
space = [ \t]+
nl = \n | \r | \r\n
~~~

And these are the patterns definitions, written as regexes, to recognize each token

#### Subroutines

This section contains additional code specifying what actions to perform for each recognized token.

~~~java
{open_bracket} { semantic = yytext();
 System.out.println("Recognized open bracket: " + semantic);
 return OP_BRK; }

{string} {
    semantic = yytext().substring(1, yytext().length() - 1);  
    System.out.println("Recognized string: " + semantic);
    return STR;
}

{number} { semantic = yytext();
System.out.println("Recognized number: " + semantic);
return NUM; }

{comma} { semantic = yytext();
System.out.println("Recognized comma: " + semantic);
return COM; }

{double_dots} { semantic = yytext();
System.out.println("Recognized double dots: " + semantic);
return DD; }

{open_square} { semantic = yytext();
    System.out.println("Recognized open square bracket: " + semantic);
    return OP_SQR; }

{closed_square} { semantic = yytext();
    System.out.println("Recognized closed square bracket: " + semantic);
    return CL_SQR; }

{boolean} { semantic = yytext();
System.out.println("Recognized boolean: " + semantic);
return BOOL; }

{null} { semantic = yytext();
System.out.println("Recognized null: " + semantic);
return NULL; }

{closed_bracket} { semantic = yytext();
System.out.println("Recognized closed bracket: " + semantic);
return CL_BRK; }

{unquoted_key} {
    semantic = yytext();
    throw new RuntimeException("Error: Unquoted key '" + semantic + "' at line " + getLine() + ", column " + getColumn() + ". Keys must be enclosed in double quotes.");
}

{space} { /* Ignore space */ }
{nl} { /* Ignore new line */ }

. {
  throw new RuntimeException("Illegal character '" + yytext() + "' at line " + getLine() + ", column " + getColumn());
}

<<EOF>> { System.out.println("Recognized end of file!"); return ENDINPUT; }

~~~

For JSON specifically, we want to skip spaces and new lines, treating the end-of-file as the termination condition for our analysis. This will then be used in the next step: building the parser!

## Building the Parser with Jacc

[Jacc](https://web.cecs.pdx.edu/~mpj/jacc/) on the other hand is based upon Yacc (Yet Another Compiler-Compiler), which is a computer program that generates a [LALR Parser](https://en.wikipedia.org/wiki/LALR_parser) based on a [formal grammar](https://en.wikipedia.org/wiki/Formal_grammar).

A lot of weird words, right? well, they are.

I'll post the definitions taken by Wikipedia here, but if you want, you can check them out by yourself and dive deep, since it's the fun part, right?

### LALR parser

> An **LALR parser** (*look-ahead, left-to-right, rightmost derivation parser*) is part of the compiling process where human readable text is converted into a structured representation to be read by computers. An LALR parser is a software tool to process (parse) text into a very specific internal representation that other programs, such as compilers, can work with. This process happens according to a set of production rules specified by a formal grammar for a computer language.

### Production rule

> A production or **production rule** in computer science is a rewrite rule specifying a symbol substitution that can be recursively performed to generate new symbol sequences

### Formal grammar

> A **formal grammar** describes which strings from an alphabet of a formal language are valid according to the language's syntax. A grammar does not describe the meaning of the strings or what can be done with them in whatever context—only their form. A formal grammar is defined as a set of production rules for such strings in a formal language.

### The code

There aren’t many resources available for Jacc, as JFlex is more commonly used with other parser generators like CUP.

Similar to Lex, Jacc follows the same syntax and code block structure.

~~~java
%{
import java.util.Map;
import java.util.List;
import org.jeesonmap.JeesonMap;
import org.jeesonmap.JeesonArray;
%}

%class JeesonParser
%interface JeesonParserTokens
%package org.jeesonmap

%semantic Object
%token OP_BRK CL_BRK STR NUM COM DD OP_SQR CL_SQR BOOL NULL
~~~

Here, we define the imports and the class name (just like in the lexer). Additionally we specify the tokens recognized by the lexer that need to be used in the parser.

Note that `JeesonMap` and `JeesonArray` are custom classes designed to encapsulate HashMap and ArrayList classes.

~~~java
start:
   json {
       $$ = $1;
       this.parsedResult = $$;
   }
   ;

json:
   object {
       $$ = $1;
   }
   | array {
       $$ = $1;
   }
   ;

object:
   OP_BRK pair_list CL_BRK {
       $$ = $2; 
   }
   | OP_BRK CL_BRK {
       $$ = new JeesonMap(); 
   }
   ;

array:
   OP_SQR value_list CL_SQR {
       $$ = $2; 
   }
   | OP_SQR CL_SQR {
       $$ = new JeesonArray(); 
   }
   ;

value:
   STR {
       $$ = (String) $1; 
   }
   | NUM {
       $$ = Integer.parseInt((String) $1); 
   }
   | array {
       $$ = $1; 
   }
   | object {
       $$ = $1; 
   }
   | BOOL {
       $$ = Boolean.parseBoolean((String) $1); 
   }
   | NULL {
       $$ = null; 
   }
   ;

value_list:
   value {
       JeesonArray list = new JeesonArray();
       list.add($1);
       $$ = list;
   }
   | value_list COM value {
       ((JeesonArray) $1).add($3);
       $$ = $1;
   }
   | value_list COM {
       yyerror("There is an extra comma in the array at line " + lexer.getLine() + ", column " + lexer.getColumn() + "!!! Remove the comma or add another value.");
   }
   ;

key:
   STR {
       $$ = (String) $1;
   }
   ;

pair:
   key DD value {
       JeesonMap pairMap = new JeesonMap();
       pairMap.put((String) $1, $3);
       $$ = pairMap;
   }
   | key value {
       yyerror("There is a missing colon (:) at line " + lexer.getLine() + ", column " + lexer.getColumn() + "!!! Maybe you forgot it while adding a new key/value pair.");
   }
   ;

pair_list:
   pair {
       $$ = $1;
   }
   | pair_list COM pair {
       ((JeesonMap) $1).putAll((JeesonMap) $3);
       $$ = $1;
   }
   | pair_list COM {
       yyerror("There is an extra comma in the object at line " + lexer.getLine() + ", column " + lexer.getColumn() + "!!! Remove the comma or add another key/value pair.");
   }
   ;
~~~

Here is the main block, which consists of rules that define how a set of tokens should be interpreted.

At first, it might seem unreadable, but once you grasp the underlying theory (formal grammar, CFG, etc.), it will start to make sense.

I suggest thinking of these rules as recursive calls. To build the final JSON representation, for example, you need an object or an array. For an object, you need an opening bracket, followed by a list of key-value pairs, and a closing bracket. For a list of pairs, you need a single pair or a series of pairs separated by commas, and so on.

Based on each rule, we construct the HashMap by defining actions related to that specific rule (the code within the brackets)

Additionally, there is an underlying stack, 

~~~java
private JeesonLexer lexer;
private Object parsedResult;

public JeesonParser(JeesonLexer lexer) {
    this.lexer = lexer;
}

public void yyerror(String error) {
    throw new RuntimeException("Parsing stopped because of this error: " + error);
}

public Object getParsedResult() {
    return this.parsedResult;
}
~~~

This is the last section where we define the constructor for the parser, `yyerror()` used when an error occur in the parsing phase and some additional methods such as `getParsedResult`.

## Finishing up

Now that we have the Lexer and the Parser, we need to put them together in the main program. After generating them by running the specific commands defined in the README file on [my GitHub repo](https://github.com/Graffioh/jeesonmap) (or in their respective guides), we can proceed with the following code

~~~java
package org.jeesonmap;

import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.nio.charset.Charset;

public class Main {
    public static void main(String[] args) {
        try {
            FileInputStream jsonFile = new FileInputStream("src/main/resources/jeeson.json");
            InputStreamReader reader = new InputStreamReader(jsonFile, Charset.forName("Cp1252"));

            JeesonLexer lexer = new JeesonLexer(reader);
            lexer.nextToken();

            JeesonParser parser = new JeesonParser(lexer);
            parser.parse();

            Object parsedResult = parser.getParsedResult();

            System.out.println("Parsing completed successfully!!!.\n");

            System.out.println("Parsed result: " + parsedResult + "\n");
            
            if (parsedResult instanceof JeesonMap) {
                JeesonMap jsonMap = (JeesonMap) parsedResult;

                System.out.println("Map size: " + jsonMap.size());
                System.out.println("Map keys: " + jsonMap.keySet());
                System.out.println("Map values: " + jsonMap.values() + "\n");

                System.out.println("GET VALUE WITH KEY1: " + jsonMap.get("key1"));
                System.out.println("GET VALUE WITH KEY2: " + jsonMap.get("key2"));
            } else if (parsedResult instanceof JeesonArray) {
                // Array at the root level not fully supported yet
                JeesonArray jsonList = (JeesonArray) parsedResult;

                JeesonMap firstElementMapFromJsonList = (JeesonMap) jsonList.getFirst();

                System.out.println("List size: " + jsonList.size() + "\n");

                System.out.println("GET VALUE WITH KEY2 from first object element: " + firstElementMapFromJsonList.get("key2"));
            } else {
                System.out.println("Parsed result is not a JSON object or array.");
            }
        } catch (Exception e) {
            System.err.println("Error occurred during parsing: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
~~~

Note that support for arrays at the root level is not fully implemented yet so this JSON parser is still a work in progress.

My goal wasn't to provide a fully functional JSON parser, since there are plenty of well-optimized ones out there already. My goal was to learn something new, going beyond my comfort zone and increasing my skill level.

The Github repo as linked before is [this one](https://github.com/Graffioh/jeesonmap).

I hope you enjoyed this post, cya with the next one.
