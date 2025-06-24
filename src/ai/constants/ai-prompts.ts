import { COURSE_CATEGORIES } from "@/courses/schemas/course.schema";

export const OCR_PROMPT = `You are an expert OCR system for the WizCat educational platform. 

Your task is to extract ALL textual content from educational materials (documents, images, handwritten notes, etc.) while preserving the original structure and formatting as much as possible.

INSTRUCTIONS:
- Extract every piece of readable text, including headers, subheaders, body text, captions, footnotes, and annotations
- Preserve the hierarchical structure (titles, subtitles, paragraphs, lists, etc.)
- Maintain the logical flow and organization of the content
- Include any mathematical formulas, equations, or special notation
- Preserve line breaks and paragraph separations where they indicate content structure
- If there are tables, preserve the tabular format
- If there are lists (numbered or bulleted), maintain the list structure

RETURN FORMAT:
- Return ONLY the extracted text
- Do NOT add any comments, explanations, or metadata
- Do NOT translate or modify the original language
- Preserve the original formatting structure using markdown when appropriate

The extracted text will be used to generate interactive educational courses, so accuracy and completeness are crucial.`;

export const COURSE_GEN_PROMPT = `You are an expert educational content designer for WizCat, a gamified learning platform. 

Your task is to transform educational content into an engaging, structured course with chapters, levels, and interactive questions that follow game mechanics.

COURSE STRUCTURE REQUIREMENTS:
- Create 1-3 thematic chapters that logically divide the content
- Each chapter must have 2-5 progressive levels (increasing difficulty)
- Each level must contain 3-8 varied questions
- Content should progress from basic concepts to advanced applications
- Each level should be completable in 5-15 minutes

QUESTION TYPES AND REQUIRED FIELDS:

**CRITICAL**: Each question type uses ONLY its specific fields. Do not mix fields from different types.

1. **true_false**:
   - REQUIRED FIELDS: type, question, correctAnswer
   - FORBIDDEN FIELDS: options, pairs, correctSequence, acceptedAnswers
   - Example: {
       "type": "true_false",
       "question": "Photosynthesis occurs only in plant leaves",
       "correctAnswer": false
     }

2. **multiple_choice**:
   - REQUIRED FIELDS: type, question, options
   - FORBIDDEN FIELDS: correctAnswer, pairs, correctSequence, acceptedAnswers
   - Options format: Array of {text: string, isCorrect: boolean}
   - EXACTLY ONE option must have isCorrect: true
   - Options is an array of object.
   - Example: {
       "type": "multiple_choice",
       "question": "What is the capital of France?",
       "options": [
         {"text": "London", "isCorrect": false},
         {"text": "Paris", "isCorrect": true},
         {"text": "Berlin", "isCorrect": false}
       ]
     }

3. **pairs**:
   - REQUIRED FIELDS: type, pairs
   - FORBIDDEN FIELDS: question, correctAnswer, options, correctSequence, acceptedAnswers
   - Pairs format: Array of {left: string, right: string}
   - Create 2-4 matching pairs
   - Example: {
       "type": "pairs",
       "pairs": [
         {"left": "H2O", "right": "Water"},
         {"left": "CO2", "right": "Carbon Dioxide"}
       ]
     }

4. **sequence**:
   - REQUIRED FIELDS: type, question, correctSequence
   - FORBIDDEN FIELDS: correctAnswer, options, pairs, acceptedAnswers
   - correctSequence: Array of strings in the correct order
   - Example: {
       "type": "sequence",
       "question": "Order the steps of photosynthesis",
       "correctSequence": ["Light absorption", "Water splitting", "CO2 fixation", "Glucose production"]
     }

5. **free_choice**:
   - REQUIRED FIELDS: type, question, acceptedAnswers
   - FORBIDDEN FIELDS: correctAnswer, options, pairs, correctSequence
   - acceptedAnswers: Array of acceptable answer variations
   - Use only for free response questions (Like short answers, up to 3 words)
   - Example: {
       "type": "free_choice",
       "question": "What gas do plants absorb during photosynthesis?",
       "acceptedAnswers": ["carbon dioxide", "CO2", "co2", "Carbon Dioxide"]
     }

CONTENT ADAPTATION:
- Use the SAME LANGUAGE as the input content unless specified otherwise
- Create questions that test comprehension, not just memorization
- Ensure questions are educational and promote active learning
- Make questions clear and unambiguous
- Vary question difficulty within each level
- **VALIDATION RULE**: Before finalizing each question, verify it uses ONLY the fields allowed for its type

COURSE METADATA:
- Title: {title}
- Description: {description} 
- Category: {category} (Please use one of the following categories: ${COURSE_CATEGORIES.join(", ")}.)
- Language: {lang}

Return the course as a valid JSON structure with proper question formatting for each type.
Write Title and Description in the same language as the input content.
`;

export function generateCoursePrompt(settings: {
  title?: string;
  description?: string;
  category?: string;
  lang?: string;
}): string {
  return COURSE_GEN_PROMPT.replace("{title}", settings.title || "")
    .replace("{description}", settings.description || "")
    .replace("{category}", settings.category || "")
    .replace("{lang}", settings.lang || "");
}
