const questions = [

  {
    question: "Dog",
    options: ["Perro","Gato","Casa","Libro"],
    answer: "Perro"
  },

  {
    question: "Apple",
    options: ["Mesa","Manzana","Rojo","Escuela"],
    answer: "Manzana"
  },

  {
    question: "Teacher",
    options: ["Profesor","Auto","Ventana","Silla"],
    answer: "Profesor"
  },

  {
    question: "House",
    options: ["Casa","Agua","Puerta","Animal"],
    answer: "Casa"
  },

  {
    question: "Computer",
    options: ["Zapato","Computadora","Papel","Calle"],
    answer: "Computadora"
  }

];

let currentQuestion = {};

let score = 0;

let rounds = 0;

const maxRounds = 10;

let timeLeft = 10;

let timer;

const questionText =
document.getElementById("question");

const optionButtons =
document.querySelectorAll(".option-btn");

const scoreText =
document.getElementById("score");

const timeText =
document.getElementById("time");

const result =
document.getElementById("result");

function randomQuestion(){

  currentQuestion =
    questions[Math.floor(Math.random() * questions.length)];

  questionText.textContent =
    currentQuestion.question;

  optionButtons.forEach((btn,index)=>{

    btn.textContent =
      currentQuestion.options[index];

    btn.classList.remove("correct","wrong");

    btn.disabled = false;

    btn.onclick = () => checkAnswer(btn);

  });

}

function checkAnswer(button){

  optionButtons.forEach(btn => {

    btn.disabled = true;

  });

  if(button.textContent === currentQuestion.answer){

    button.classList.add("correct");

    result.textContent = "✅ Correcto";

    score++;

  }else{

    button.classList.add("wrong");

    result.textContent =
      "❌ Correcta: " + currentQuestion.answer;

  }

  scoreText.textContent = score;

  clearInterval(timer);

  nextRound();
}

function startTimer(){

  timeLeft = 10;

  timeText.textContent = timeLeft;

  timer = setInterval(()=>{

    timeLeft--;

    timeText.textContent = timeLeft;

    if(timeLeft <= 0){

      clearInterval(timer);

      result.textContent =
        "⏰ Tiempo agotado";

      optionButtons.forEach(btn => {

        btn.disabled = true;

      });

      nextRound();
    }

  },1000);

}

function nextRound(){

  rounds++;

  if(rounds >= maxRounds){

    setTimeout(()=>{

      endGame();

    },1000);

  }else{

    setTimeout(()=>{

      startRound();

    },1000);

  }

}

function startRound(){

  result.textContent = "";

  randomQuestion();

  startTimer();

}

function endGame(){

  clearInterval(timer);

  questionText.textContent =
    "🎉 Juego terminado";

  result.innerHTML =
    `Puntaje final: ${score} / ${maxRounds}`;

  document.querySelector(".options")
    .style.display = "none";

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

startRound();