const questions = [
  {
    question: "¿Cómo se dice 'Perro' en inglés?",
    options: ["Dog", "Cat", "Bird", "Fish"],
    answer: "Dog"
  },
  {
    question: "¿Cómo se dice 'Casa' en inglés?",
    options: ["School", "House", "Car", "Tree"],
    answer: "House"
  },
  {
    question: "¿Cómo se dice 'Rojo' en inglés?",
    options: ["Blue", "Green", "Yellow", "Red"],
    answer: "Red"
  },
  {
    question: "¿Cómo se dice 'Manzana' en inglés?",
    options: ["Apple", "Banana", "Orange", "Pear"],
    answer: "Apple"
  },
  {
    question: "¿Cómo se dice 'Gracias' en inglés?",
    options: ["Hello", "Sorry", "Thanks", "Bye"],
    answer: "Thanks"
  },
  {
    question: "¿Cómo se dice 'Gato' en inglés?",
    options: ["Dog", "Cat", "Bird", "Fish"],
    answer: "Cat"
  },
  {
    question: "¿Cómo se dice 'Pollo' en inglés?",
    options: ["Dog", "Pollo", "Bird", "Fish"],
    answer: "Pollo"
  }
  
];

let currentQuestion = 0;
let score = 0;

const questionEl = document.getElementById("question");
const optionBtns = document.querySelectorAll(".option-btn");
const resultEl = document.getElementById("result");
const scoreEl = document.getElementById("score");
const nextBtn = document.getElementById("nextBtn");

function loadQuestion(){
  resetState();

  const q = questions[currentQuestion];
  questionEl.textContent = q.question;

  optionBtns.forEach((btn, index) => {
    btn.textContent = q.options[index];

    btn.onclick = () => checkAnswer(btn, q.answer);
  });
}

function checkAnswer(button, correctAnswer){

  optionBtns.forEach(btn => btn.disabled = true);

  if(button.textContent === correctAnswer){
    button.classList.add("correct");
    resultEl.textContent = "✅ ¡Correcto!";
    score++;
  } else {
    button.classList.add("wrong");
    resultEl.textContent = "❌ Incorrecto";

    optionBtns.forEach(btn => {
      if(btn.textContent === correctAnswer){
        btn.classList.add("correct");
      }
    });
  }

  scoreEl.textContent = score;
}

function resetState(){
  resultEl.textContent = "";

  optionBtns.forEach(btn => {
    btn.disabled = false;
    btn.classList.remove("correct", "wrong");
  });
}

nextBtn.addEventListener("click", () => {
  currentQuestion++;

  if(currentQuestion < questions.length){
    loadQuestion();
  } else {
    showFinalScore();
  }
});

function showFinalScore(){
  questionEl.textContent = "🎉 Juego terminado";
  
  document.querySelector(".options").style.display = "none";
  
  resultEl.innerHTML = `
    Tu puntaje final fue: <strong>${score}</strong> / ${questions.length}
  `;

  nextBtn.style.display = "none";
}

loadQuestion();