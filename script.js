document.addEventListener("DOMContentLoaded", () => {

const title = document.getElementById("title");
const time = document.getElementById("time");
const startBtn = document.getElementById("startBtn");

const t1 = document.getElementById("t1");
const notice1 = document.getElementById("notice1");
const send1Btn = document.getElementById("send1Btn");

const resp1 = document.getElementById("resp1");

const t2 = document.getElementById("t2");
const send2Btn = document.getElementById("send2Btn");

const final = document.getElementById("final");

/* navigation */
function go(n){
document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
document.getElementById("s"+n).classList.add("active");
}

/* typing */
function type(el,text){
el.innerHTML="";
let i=0;
function t(){
if(i<text.length){
el.innerHTML+=text[i++];
setTimeout(t,25);
}
}
t();
}

/* greeting */
let h=new Date().getHours();
let g = h<6?"You're still awake… I was waiting."
:h<12?"Good morning… I hoped you'd come."
:h<18?"You chose this moment… interesting."
:"Tonight feels quieter… now you're here.";

type(title,g);

time.innerText =
"You opened this at "+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

/* start */
startBtn.addEventListener("click",()=>{
go(1);
});

/* typing tracking */
let startTime;
let typing=false;

t1.addEventListener("input",()=>{
if(!typing){
typing=true;
startTime=Date.now();
}

let len=t1.value.length;

if(len===1) notice1.innerText="you started…";
if(len===50) notice1.innerText="you're thinking carefully…";
});

/* send1 */
send1Btn.addEventListener("click",()=>{
let txt=t1.value.trim();
if(!txt){alert("write something");return;}

let duration=(Date.now()-startTime)/1000;

go(2);

let r = duration>10
? "You took your time… that matters."
: txt.length<20
? "Short… but honest."
: "There’s something real in that.";

type(resp1,r);

setTimeout(()=>go(3),2000);
});

/* send2 */
send2Btn.addEventListener("click",()=>{
let txt=t2.value.trim();
if(!txt){alert("say something");return;}

go(4);

let r = txt.length>60
? "You don’t say things like that often… do you?"
: "Even that small thing… meant more than you think.";

type(final,r+" 🌸");
});

});
