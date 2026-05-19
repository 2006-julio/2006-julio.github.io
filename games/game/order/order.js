const words = [
  "apple",
  "banana",
  "computer",
  "school",
  "teacher",
  "english",
  "library",
  "student",
  "orange",
  "elephant"
];

let currentWord = "";
let score = 0;

let rounds = 0;
const maxRounds = 10;

const scrambledWord =
document.getElementById("scrambled-word");

const userInput =
document.getElementById("user-input");

const checkBtn =
document.getElementById("check-btn");

const result =
document.getElementById("result");

const scoreText =
document.getElementById("score");

function shuffleWord(word){

  let shuffled = word;

  while(shuffled === word){

    shuffled = word
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  return shuffled;
}

function newWord(){

  currentWord =
    words[Math.floor(Math.random() * words.length)];

  scrambledWord.textContent =
    shuffleWord(currentWord);

  userInput.value = "";

  result.textContent = "";
}

checkBtn.addEventListener("click", ()=>{

  const answer =
    userInput.value.toLowerCase().trim();

  if(answer === currentWord){

    result.textContent =
      "✅ Correcto";

    score++;

  }else{

    result.textContent =
      "❌ Era: " + currentWord;
  }

  scoreText.textContent = score;

  rounds++;

  if(rounds >= maxRounds){

    setTimeout(() => {

      endGame();

    }, 1500);

  }else{

    setTimeout(() => {

      newWord();

    }, 1500);

  }

});

function endGame(){

  scrambledWord.textContent =
    "🎉 Juego terminado";

  result.innerHTML =
    `Puntaje final: ${score} / ${maxRounds}`;

  userInput.style.display = "none";

  checkBtn.style.display = "none";

  const restartBtn =
    document.createElement("button");

  restartBtn.textContent =
    "🔄 Reiniciar";

  restartBtn.style.marginTop = "20px";

  restartBtn.onclick = () => {

    location.reload();

  };

  document.querySelector(".game-box")
    .appendChild(restartBtn);
}

newWord();