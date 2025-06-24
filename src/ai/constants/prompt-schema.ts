export const COURSE_STRUCTURE_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Course title",
    },
    description: {
      type: "string",
      description: "Course description",
    },
    category: {
      type: "string",
      description: "Course category",
    },
    lang: {
      type: "string",
      description: "Course language",
    },
    chapters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Chapter title" },
          description: {
            type: "string",
            description: "Chapter description",
          },
          levels: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Level title" },
                description: {
                  type: "string",
                  description: "Level description",
                },
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: [
                          "true_false",
                          "multiple_choice",
                          "pairs",
                          "sequence",
                          "free_choice",
                        ],
                        description: "Question type",
                      },
                      question: {
                        type: "string",
                        description: "Question text",
                      },
                      correctAnswer: {
                        type: "boolean",
                        description: "Correct answer for true_false questions",
                      },
                      options: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            text: { type: "string" },
                            isCorrect: { type: "boolean" },
                          },
                          required: ["text", "isCorrect"],
                        },
                        description: "Options for multiple_choice questions",
                      },
                      pairs: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            left: { type: "string" },
                            right: { type: "string" },
                          },
                        },
                        description: "Pairs for matching questions",
                      },
                      correctSequence: {
                        type: "array",
                        items: { type: "string" },
                        description: "Correct sequence for ordering questions",
                      },
                      acceptedAnswers: {
                        type: "array",
                        items: { type: "string" },
                        description:
                          "Accepted answers for free response questions",
                      },
                    },
                    required: ["type", "question"],
                  },
                },
              },
              required: ["title", "description", "questions"],
            },
          },
        },
        required: ["title", "description", "levels"],
      },
    },
  },
  required: ["title", "description", "category", "lang", "chapters"],
} as const;
