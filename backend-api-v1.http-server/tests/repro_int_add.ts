
import { mapMasterGenerate } from "../src/mapmaster/index";
import { InMemoryInvariantRegistry } from "../src/invariants/index";
import { loadAllCoursesFromDir } from "../src/invariants/invariants.course-loader";
import { join } from "path";

async function run() {
    console.log("--- Reproducing 2+3 Failure ---");

    const configPath = join(process.cwd(), "config/courses");
    console.log("Loading courses from:", configPath);
    const registry = loadAllCoursesFromDir({ path: configPath });

    // Debug: list loaded courses
    console.log("Loaded courses:", registry.getAllInvariantSets().map(s => s.id));

    const course = registry.getInvariantSetById("default");

    if (!course) {
        console.error("Course not found!");
        process.exit(1);
    }

    const input = {
        expressionLatex: "2+3",
        selectionPath: null,
        operatorIndex: 0, // The '+'
        invariantSetIds: [course.id],
        registry: registry
    };

    console.log("Input:", input);

    const result = mapMasterGenerate(input);

    console.log("Candidates found:", result.candidates.length);
    result.candidates.forEach((c, i) => {
        console.log(`[${i}] ${c.id}: ${c.description}`);
    });

    if (result.candidates.length === 0) {
        console.error("FAIL: No candidates found for 2+3");
        process.exit(1);
    } else {
        console.log("PASS: Candidates found");
    }
}

run();
