# sfq
### A Simple Fucking Queue

*sfq* is a lightweight message broker implemented in nodejs with zero outside dependencies. Inspired by the infamous disasters that occur when a nodejs dependency introduces a breaking change that breaks countless software projects, the goal was to implement this project in such a way that no npm dependencies were used at all.

Just git clone this repository, and run `node app/server.js`.

In the `scripts` folder are optional gulp tasks that do require an npm install (for the gulp dependency), with client examples. 
