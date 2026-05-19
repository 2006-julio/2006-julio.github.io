const words = [
  "apple",
  "banana",
  "computer",
  "dog",
  "cat",
  "school",
  "teacher",
  "car",
  "table",
  "book",
  "notebook",
  "pencil",
  "pen",
  "eraser",
  "scissors",
  "keys",
  "phone"
];

let currentWord = "";
let currentLevel = "easy";

const result = document.getElementById("result");
const playBtn = document.getElementById("playBtn");

function randomWord(){
  currentWord = words[Math.floor(Math.random() * words.length)];
}

randomWord();

function speakWord(){

  const speech = new SpeechSynthesisUtterance(currentWord);

  speech.lang = "en-US";

  speech.rate = 0.9;

  speechSynthesis.speak(speech);
}

playBtn.addEventListener("click", speakWord);

function setLevel(level){

  currentLevel = level;

  document.getElementById("easyMode").classList.add("hidden");
  document.getElementById("mediumMode").classList.add("hidden");
  document.getElementById("hardMode").classList.add("hidden");

  if(level === "easy"){
    document.getElementById("easyMode").classList.remove("hidden");
  }

  if(level === "medium"){
    document.getElementById("mediumMode").classList.remove("hidden");
    generateOptions();
  }

  if(level === "hard"){
    document.getElementById("hardMode").classList.remove("hidden");
  }

  result.textContent = "";
}

function checkEasy(){

  const answer = document
    .getElementById("textAnswer")
    .value
    .toLowerCase()
    .trim();

  if(answer === currentWord){

    result.textContent = "✅ Correcto";

  }else{

    result.textContent = "❌ Era: " + currentWord;

  }

  document.getElementById("textAnswer").value = "";

  randomWord();
}

function generateOptions(){

  const buttons = document.querySelectorAll(".option-btn");

  let options = [currentWord];

  while(options.length < 4){

    let random = words[Math.floor(Math.random() * words.length)];

    if(!options.includes(random)){
      options.push(random);
    }
  }

  options.sort(() => Math.random() - 0.5);

  buttons.forEach((btn,index)=>{

    btn.textContent = options[index];

    btn.onclick = () => {

      if(btn.textContent === currentWord){

        result.textContent = "✅ Correcto";

      }else{

        result.textContent = "❌ Era: " + currentWord;

      }

      randomWord();

      generateOptions();
    };

  });
}

const SpeechRecognition =
window.SpeechRecognition ||
window.webkitSpeechRecognition;

if(SpeechRecognition){

  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";

  recognition.onresult = (event) => {

    const text = event.results[0][0].transcript.toLowerCase();

    document.getElementById("speechText").textContent =
      "Escuchado: " + text;

    if(text.includes(currentWord)){

      result.textContent = "✅ Buena pronunciación";

    }else{

      result.textContent = "❌ Intenta otra vez";
    }

    randomWord();
  };

  document.getElementById("micBtn")
    .addEventListener("click", ()=>{

      recognition.start();

    });

}