import { QuestionType } from "@/levels/schemas/question.schema";
import { BadRequestException } from "@nestjs/common";

export function validateQuestions(questions: any[]): void {
  for (const question of questions) {
    console.log(question);
    console.log(question?.options);
  }

  for (const question of questions) {
    if (
      !question.type ||
      !Object.values(QuestionType).includes(question.type)
    ) {
      throw new BadRequestException("Invalid question type");
    }

    // Type-specific validations
    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        if (typeof question.correctAnswer !== "boolean") {
          throw new BadRequestException(
            "True/False question must have a boolean correctAnswer"
          );
        }
        break;

      case QuestionType.MULTIPLE_CHOICE:
        if (!Array.isArray(question.options) || question.options.length < 2) {
          throw new BadRequestException(
            "Multiple choice question must have at least 2 options"
          );
        }
        const correctOptions = question.options.filter(
          (opt: any) => opt.isCorrect
        );
        if (correctOptions.length === 0) {
          throw new BadRequestException(
            "Multiple choice question must have at least one correct option"
          );
        }
        break;

      case QuestionType.PAIRS:
        if (!Array.isArray(question.pairs) || question.pairs.length < 2) {
          throw new BadRequestException(
            "Pairs question must have at least 2 pairs"
          );
        }
        break;

      case QuestionType.SEQUENCE:
        if (
          !Array.isArray(question.correctSequence) ||
          question.correctSequence.length < 2
        ) {
          throw new BadRequestException(
            "Sequence question must have at least 2 items"
          );
        }
        break;

      case QuestionType.FREE_CHOICE:
        if (
          !Array.isArray(question.acceptedAnswers) ||
          question.acceptedAnswers.length === 0
        ) {
          throw new BadRequestException(
            "Free choice question must have at least one accepted answer"
          );
        }
        break;
    }
  }
}
