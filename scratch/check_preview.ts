import { generateAssignmentPreview } from "../lib/judging/assignment";

async function main() {
    // stageId: "cmuqhw93o000p5wuqsz6iu9ih"
    const preview = await generateAssignmentPreview("cmuqhw93o000p5wuqsz6iu9ih");
    console.log(JSON.stringify(preview, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
