const readline = require("readline");
var imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const _ = require('lodash');
const { resolve } = require("path");
var colors = require('colors');
const fs = require('fs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

process.stdout.write(String.fromCharCode(27) + "]0;" + "by TrackZone" + String.fromCharCode(7));

var hostname;
var port;
var tls;
var file_input;
var file_output;
var select_box;
var word_search;

const question1 = () => {
    return new Promise((resolve, reject) => {
      rl.question('HOSTNAME (IMAP) : ', (answer) => {
        hostname = answer;
        resolve()
      })
    })
}

const question2 = () => {
    return new Promise((resolve, reject) => {
      rl.question('PORT (IMAP) : ', (answer) => {
        port = Number(answer);
        resolve()
      })
    })
}

const question3 = () => {
    return new Promise((resolve, reject) => {
      rl.question('TLS (IMAP) true/false : ', (answer) => {
        if (answer == "true") {
            tls = true;
        }else if (answer == "false") {
            tls = false;
        }
        resolve()
      })
    })
}

const question4 = () => {
    return new Promise((resolve, reject) => {
      rl.question('File Input Accounts Email (email:password) : ', (answer) => {
        file_input = answer;
        resolve()
      })
    })
}

const question5 = () => {
    return new Promise((resolve, reject) => {
      rl.question('File Output Accounts Email : ', (answer) => {
        file_output = answer;
        resolve()
      })
    })
}

const question6 = () => {
    return new Promise((resolve, reject) => {
      rl.question('BOX NAME (DEFAULT: INBOX) (IMAP) : ', (answer) => {
        if (!answer) {
            select_box = "INBOX";
        }else{
            select_box = answer;
        }
        resolve()
      })
    })
}

const question7 = () => {
    return new Promise((resolve, reject) => {
      rl.question('Which word containing in the title of the email you wish not to recover ? ', (answer) => {
        word_search = answer;
        resolve()
      })
    })
}

(async () => {
    await question1();
    await question2();
    await question3();
    await question4();
    await question5();
    await question6();
    await question7();

    rl.close();

    console.log("SET HOSTNAME : " + hostname);
    console.log("SET PORT : " + port);
    console.log("SET TLS : " + tls);
    console.log("SET FILE INPUT : " + file_input);
    console.log("SET FILE OUTPUT : " + file_output);
    console.log("SET BOX NAME : " + select_box);
    console.log("SET WORD SEARCH : " + word_search);

    /*
    
    CONFIG 
    
    */

    const accounts = fs.readFileSync(file_input).toString().replace(/\r/gi, "").split("\n");
    var StreamAccounts = fs.createWriteStream(file_output, {
        flags: 'a' // 'a' means appending (old data will be preserved)
    });


    /*
    
    IMAP

    */

    accounts.forEach(function(account, i) {
    
        if (!account) return false;

        setTimeout(async function() {

            var username = account.split(":")[0];
            var password = account.split(":")[1];

            var config = {
                imap: {
                    user: username,
                    password: password,
                    host: hostname,
                    port: port,
                    tls: tls,
                    authTimeout: 3000
                }
            };
        
            var discord_exist = 0;

            await imaps.connect(config).then(function(connection) {
                //console.log("[+] Connected To " + hostname + ":" + port);
                return connection.openBox(select_box).then(function() {
                    var searchCriteria = ['UNSEEN'];
                    var fetchOptions = {
                        bodies: ['HEADER', 'TEXT', ''],
                    };
                    return connection.search(searchCriteria, fetchOptions).then(function(messages) {
                        messages.forEach(function(item) {
                            var all = _.find(item.parts, {
                                "which": ""
                            })
                            var id = item.attributes.uid;
                            var idHeader = "Imap-Id: " + id + "\r\n";
            
                            simpleParser(idHeader + all.body, (err, mail) => {
    
                              if (!err){
                                  //console.log(mail.subject + " " + mail.date);
          
                                  if (mail.subject.toLowerCase().includes(word_search.toLowerCase())) {
                                    discord_exist = 1;
                                  }
                              }
                            });

                        });
                    });
                });
            }, function(err) {
              discord_exist = 1;
              console.log("[-] Error Connecting To " + hostname + ":" + port);
            });

            setTimeout(async function() {

              if (discord_exist == 1) {
                  console.log(colors.red("[EMAIL USED] => " + username));
              }else{
                const accounts_out = fs.readFileSync(file_output).toString().replace(/\r/gi, "").split("\n");
                console.log(colors.green("[EMAIL NOT USED] => " + username));
                StreamAccounts.write(username + ":" + password + "\n");
                process.stdout.write(String.fromCharCode(27) + "]0;" + accounts_out.length + "/" + accounts.length + String.fromCharCode(7));
              }

              }, 500);

        }, i * 500);
    });



})();
