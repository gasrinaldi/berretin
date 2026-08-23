"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/discover";

export function QuizWidget({ questions }: { questions: QuizQuestion[] }) {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  if (questions.length === 0) {
    return <p className="no-results">no hay suficientes palabras para armar el quiz por ahora</p>;
  }

  if (step >= questions.length) {
    return (
      <div className="discover-quiz-result">
        <p className="ficha-word">
          {score} / {questions.length}
        </p>
        <p className="contribute-hint">respuestas correctas</p>
      </div>
    );
  }

  const question = questions[step];

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    if (question.options[index].correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    setSelected(null);
    setStep((s) => s + 1);
  };

  return (
    <div className="discover-quiz">
      <p className="discover-quiz-progress">
        pregunta {step + 1} de {questions.length}
      </p>
      <p className="discover-quiz-word">{question.palabra}</p>
      <p className="discover-quiz-prompt">¿cuál es el significado correcto?</p>
      <div className="discover-quiz-options">
        {question.options.map((option, index) => {
          const showState = selected !== null;
          const stateClass = showState ? (option.correct ? " correct" : selected === index ? " wrong" : "") : "";
          return (
            <button key={option.text} type="button" className={`discover-quiz-option${stateClass}`} onClick={() => handleSelect(index)} disabled={selected !== null}>
              {option.text}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <button type="button" className="share-btn" onClick={handleNext}>
          {step + 1 < questions.length ? "siguiente pregunta" : "ver resultado"}
        </button>
      )}
    </div>
  );
}
