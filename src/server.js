import https from "node:http";
import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { WebSocketServer } from "ws";
import mysql from "mysql2";
import { dbConnect } from "../PRIVATEKEYS.js";
import { v4 } from "uuid";

var connection = mysql.createConnection(dbConnect);

connection.query("select * from Users", (err, res, fields) => {
  console.log(res);
});

let httpServer = https.createServer((req, res) => {
  // if (req.url == "/home") res.end("Home");

  if (req.url == "/createDoc" && req.method == "POST") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    let docId = v4();
    connection.query(
      `insert into googlydocs (docid , content) values ('${docId}' , '');`,
      (err, response) => {
        if (err) res.end(JSON.stringify(err.message));
        else {
          res.end(JSON.stringify(docId));
        }
      }
    );
  }
});
let rl = readline.createInterface({ input, output });
let wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    let res = JSON.parse(data);
    // console.log("res", res);

    if (res.type == "saveDoc") {
      console.log("dust");
      connection.query(
        `update googlydocs set content='${res.payload}' where docid='${ws.docId}';`,
        (err, out) => {
          console.log("error : ", err, "out : ", out);
        }
      );
    } else if (res.type == "docId") ws.docId = res.docId;
    else if (res.type == "getDoc") {
      console.log("tester", ws.docId);
      connection.query(
        `select content from googlydocs where docid='${ws.docId}';`,
        (err, out) => {
          if (err) console.log("err", err);
          else {
            console.log(out);
            ws.send(
              JSON.stringify({ type: "getDoc", payload: out[0].content })
            );
          }
        }
      );
    }
  });

  rl.on("line", (input) => {
    wss.clients.forEach((socket) => {
      if (socket.OPEN) {
        socket.send(
          JSON.stringify({ type: "message", payload: "Server> " + input })
        );
      }
    });
  });

  ws.on("message", (data) => {
    let inp = JSON.parse(data);
    wss.clients.forEach((socket) => {
      if (socket != ws && socket.docId == ws.docId && inp.type == "DOC-CHANGE")
        socket.send(JSON.stringify(inp));
    });
  });
});

httpServer.listen(8000, () => console.log("Listening on 8000"));
