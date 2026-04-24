import fs from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

type RawQuestion = {
  id: string;
  jurisdiction?: string;
  license_class?: string;
  license_classes?: string[];
  category?: string;
  question?: string;
  question_es?: string;
  question_ru?: string;
  type?: string;
  options: Array<{
    id: string;
    text?: string;
    text_es?: string;
    text_ru?: string;
  }>;
  correct_option_ids: string[];
  media?: Prisma.InputJsonValue;
  source?: Prisma.InputJsonValue;
  status?: string;
};

const prisma = new PrismaClient();

async function main() {
  const questionsPath = path.join(process.cwd(), "data/questions.caba.b.starter40.es-ru.json");
  const rawQuestions = JSON.parse(fs.readFileSync(questionsPath, "utf8")) as RawQuestion[];

  for (const rawQuestion of rawQuestions) {
    await prisma.question.upsert({
      where: { id: rawQuestion.id },
      update: questionData(rawQuestion),
      create: {
        id: rawQuestion.id,
        ...questionData(rawQuestion)
      }
    });

    await prisma.questionOption.deleteMany({ where: { questionId: rawQuestion.id } });
    await prisma.questionOption.createMany({
      data: rawQuestion.options.map((option, index) => ({
        questionId: rawQuestion.id,
        optionId: option.id,
        textEs: option.text_es ?? option.text ?? "",
        textRu: option.text_ru ?? "",
        sortOrder: index
      }))
    });
  }

  const mediaCount = rawQuestions.filter((question) => question.media).length;
  console.log(`Seeded ${rawQuestions.length} questions (${mediaCount} with media).`);
}

function questionData(rawQuestion: RawQuestion) {
  return {
    jurisdiction: rawQuestion.jurisdiction ?? "CABA",
    licenseClass: rawQuestion.license_class ?? rawQuestion.license_classes?.[0] ?? "B",
    category: rawQuestion.category ?? "general",
    questionEs: rawQuestion.question_es ?? rawQuestion.question ?? "",
    questionRu: rawQuestion.question_ru ?? "",
    type: rawQuestion.type ?? "single_choice",
    correctOptionIds: rawQuestion.correct_option_ids,
    media: rawQuestion.media ?? Prisma.JsonNull,
    source: rawQuestion.source ?? {},
    status: rawQuestion.status ?? "manual_review_required"
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
