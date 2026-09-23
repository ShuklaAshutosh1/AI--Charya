import type {
  ActivityMode,
  ContentItem,
  ContentOption,
  ContentProvenance,
  Grade,
  HelpKind,
  KnowledgeComponent,
  LearningGoal
} from "../domain/types.js";
import type { LearningDomain } from "../domain/learningDomain.js";

export interface QuestionSeed {
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  hint: string;
  instruction?: string;
  difficulty?: ContentItem["difficulty"];
}

interface ComponentSeed {
  id: string;
  title: string;
  shortTitle: string;
  objective: string;
  prerequisites?: string[];
  diagnostic: QuestionSeed;
  learning: QuestionSeed[];
  checkpoint: QuestionSeed;
}

interface DomainSeed {
  id: string;
  subject: string;
  topic: string;
  title: string;
  description: string;
  grade: Grade;
  reference: string;
  components: ComponentSeed[];
}

const optionIds = ["A", "B", "C", "D"];
const activities: ContentItem["activityType"][] = [
  "concept_explanation",
  "guided_practice",
  "independent_practice",
  "review"
];

function provenance(seed: DomainSeed): ContentProvenance {
  return {
    authoringSource: "AI-Charya curriculum studio",
    curriculumReference: seed.reference,
    reviewStatus: "review_required",
    version: "2026-09-foundation-v1"
  };
}

function helpFor(question: QuestionSeed): Record<HelpKind, string> {
  return {
    clarify: "Select one answer. You can choose ‘I’m not sure’ if you cannot decide.",
    known_information: question.instruction ?? "Start with the facts stated directly in the question.",
    conceptual_hint: question.hint,
    method_step: `First step: ${question.hint}`,
    analogous_example: "Try the same idea with a familiar everyday example, then return to this question.",
    guided_steps: `${question.hint} Eliminate any option that conflicts with that idea, then compare the remaining choices.`,
    complete_solution: question.explanation
  };
}

function item(
  domain: DomainSeed,
  component: ComponentSeed,
  mode: ActivityMode,
  question: QuestionSeed,
  index: number
): ContentItem {
  const offset = (index + component.id.length + mode.length) % question.options.length;
  const orderedOptions = question.options.map((_, position) => question.options[(position + offset) % question.options.length]);
  const options: ContentOption[] = orderedOptions.map((text, optionIndex) => ({
    id: optionIds[optionIndex],
    text
  }));
  const activityType = mode === "diagnostic"
    ? "diagnostic_question"
    : mode === "checkpoint"
      ? "checkpoint_question"
      : activities[index % activities.length];
  return {
    id: `${domain.id}-${component.id.split(".").at(-1)}-${mode}-${index + 1}`,
    knowledgeComponentId: component.id,
    modes: [mode],
    type: "single_choice",
    activityType,
    difficulty: question.difficulty ?? (index === 0 ? "foundational" : "standard"),
    prompt: question.prompt,
    options,
    correctOptionId: optionIds[(question.correct - offset + question.options.length) % question.options.length],
    explanation: question.explanation,
    instruction: mode === "learning" ? question.instruction : undefined,
    help: helpFor(question),
    assessmentEligible: mode !== "learning",
    provenance: provenance(domain)
  };
}

export function buildDomain(seed: DomainSeed): LearningDomain {
  const knowledgeComponents: KnowledgeComponent[] = seed.components.map((component, index) => ({
    id: component.id,
    title: component.title,
    shortTitle: component.shortTitle,
    objective: component.objective,
    prerequisites: component.prerequisites ?? [],
    order: index + 1
  }));
  const goal: LearningGoal = {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    subject: seed.subject,
    topic: seed.topic,
    grade: seed.grade,
    context: "independent",
    knowledgeComponentIds: knowledgeComponents.map((component) => component.id),
    curriculumStatus: "candidate_mapping",
    curriculumNote: `${seed.reference}. Final curriculum authority remains subject to educator review.`,
    contentVersion: "foundation-path-v1-review-required"
  };
  const contentItems = seed.components.flatMap((component) => [
    item(seed, component, "diagnostic", component.diagnostic, 0),
    ...component.learning.map((question, index) => item(seed, component, "learning", question, index)),
    item(seed, component, "checkpoint", component.checkpoint, 0)
  ]);
  return { goal, knowledgeComponents, contentItems };
}

const SCIENCE: DomainSeed = {
  id: "science-g6-materials-everyday",
  subject: "Science",
  topic: "Materials Around Us",
  title: "Materials in everyday life",
  description: "Connect observable properties of materials with how we classify, choose, and separate them.",
  grade: 6,
  reference: "Candidate alignment to NCERT Grade 6 Curiosity themes on materials and everyday separation",
  components: [
    {
      id: "materials.properties",
      title: "Relate observable material properties to useful choices",
      shortTitle: "Material properties",
      objective: "Use properties such as transparency, hardness, solubility, and conductivity to explain material choices.",
      diagnostic: {
        prompt: "Why is clear glass commonly used for a classroom window?",
        options: ["It is transparent", "It dissolves in water", "It is magnetic", "It is soft"],
        correct: 0,
        explanation: "Clear glass is transparent, so light can pass through it and people can see through it.",
        hint: "Think about the property that allows light to pass through a material."
      },
      learning: [
        {
          prompt: "Which material is the best choice for the handle of a hot cooking pan?",
          options: ["Wood", "Copper", "Aluminium", "Iron"],
          correct: 0,
          explanation: "Wood is a poor conductor of heat, so a wooden handle is safer to hold than a metal one.",
          hint: "Choose a material that does not transfer heat easily.",
          instruction: "Material choices depend on the property needed for the job."
        },
        {
          prompt: "A raincoat should be made from a material that is mainly…",
          options: ["Waterproof", "Soluble", "Absorbent", "Brittle"],
          correct: 0,
          explanation: "A waterproof material prevents rainwater from passing through to the clothes underneath.",
          hint: "The useful property must stop water from passing through."
        },
        {
          prompt: "Which observation is strongest evidence that an object is made of metal?",
          options: ["It conducts electricity", "It is blue", "It floats", "It is transparent"],
          correct: 0,
          explanation: "Electrical conductivity is a characteristic property of metals; colour alone is not reliable evidence.",
          hint: "Look for a property shared by most metals rather than an accidental feature."
        },
        {
          prompt: "Sugar seems to disappear when stirred into water because it…",
          options: ["Dissolves", "Melts", "Evaporates", "Becomes magnetic"],
          correct: 0,
          explanation: "Sugar dissolves and spreads through the water, forming a solution while remaining present.",
          hint: "The solid particles spread through the liquid without turning into a gas."
        }
      ],
      checkpoint: {
        prompt: "Copper is used inside electrical wires mainly because it…",
        options: ["Conducts electricity well", "Is transparent", "Dissolves easily", "Is very soft"],
        correct: 0,
        explanation: "Copper conducts electric current well, which makes it suitable for wiring.",
        hint: "Connect the purpose of a wire with the property electricity needs."
      }
    },
    {
      id: "materials.separation",
      title: "Choose a separation method from the properties of a mixture",
      shortTitle: "Separation methods",
      objective: "Select handpicking, sieving, filtration, sedimentation, or evaporation for familiar mixtures.",
      prerequisites: ["materials.properties"],
      diagnostic: {
        prompt: "Which method separates tea leaves from prepared tea?",
        options: ["Filtration", "Evaporation", "Handpicking", "Churning"],
        correct: 0,
        explanation: "A strainer filters the solid tea leaves from the liquid tea.",
        hint: "The mixture contains an insoluble solid and a liquid."
      },
      learning: [
        {
          prompt: "Which method is most suitable for removing a few visible stones from rice?",
          options: ["Handpicking", "Evaporation", "Filtration", "Condensation"],
          correct: 0,
          explanation: "Handpicking works when the unwanted pieces are visible, few in number, and easy to remove.",
          hint: "The pieces are large enough to identify and remove directly.",
          instruction: "Choose a method by comparing particle size, state, and solubility."
        },
        {
          prompt: "Which method separates bran from fine flour?",
          options: ["Sieving", "Churning", "Evaporation", "Magnetic separation"],
          correct: 0,
          explanation: "A sieve lets fine flour pass through while retaining the larger bran particles.",
          hint: "The two solids have different particle sizes."
        },
        {
          prompt: "How can salt be recovered from salt water?",
          options: ["Evaporate the water", "Sieve the mixture", "Use a magnet", "Handpick the salt"],
          correct: 0,
          explanation: "When the water evaporates, the dissolved salt remains behind.",
          hint: "One part of the mixture is dissolved and the liquid can change into vapour."
        },
        {
          prompt: "After mud settles at the bottom of a jar, carefully pouring off the clearer water is called…",
          options: ["Decantation", "Sieving", "Threshing", "Winnowing"],
          correct: 0,
          explanation: "Decantation separates the upper liquid after the heavier solid has settled.",
          hint: "The solid has already settled; name the careful pouring step."
        }
      ],
      checkpoint: {
        prompt: "Which method best separates insoluble sand from water?",
        options: ["Filtration", "Evaporation only", "Winnowing", "Handpicking"],
        correct: 0,
        explanation: "Filtration traps the insoluble sand while allowing water to pass through.",
        hint: "The solid does not dissolve, so a barrier can retain it."
      }
    }
  ]
};

const ENGLISH: DomainSeed = {
  id: "english-g6-reading-meaning",
  subject: "English",
  topic: "Reading for Meaning",
  title: "Read beyond the sentence",
  description: "Find central ideas, connect textual clues, and make careful inferences from short original passages.",
  grade: 6,
  reference: "Original reading material designed for middle-stage comprehension competencies in India",
  components: [
    {
      id: "reading.central_idea",
      title: "Identify the central idea of a short passage",
      shortTitle: "Central idea",
      objective: "Distinguish the main point of a passage from supporting details.",
      diagnostic: {
        prompt: "Mira began carrying a steel bottle to school. Soon, two friends did the same. By Friday, their class bin contained far fewer plastic bottles. What is the central idea?",
        options: ["One small habit can influence others", "Friday is the best school day", "Steel bottles are always heavy", "Mira dislikes her classmates"],
        correct: 0,
        explanation: "The passage shows Mira's choice spreading to her friends and reducing plastic waste.",
        hint: "Choose the idea that connects all three sentences, not one detail."
      },
      learning: [
        {
          prompt: "Every evening, Kabir noted the moon's shape in a notebook. After several weeks, he saw that the shapes repeated in a pattern. What is the main idea?",
          options: ["Careful observation can reveal patterns", "The moon appears only in the evening", "Notebooks should have blank pages", "Several weeks is too long to wait"],
          correct: 0,
          explanation: "Kabir's repeated observations help him discover a recurring pattern.",
          hint: "Ask what Kabir learned because he observed repeatedly.",
          instruction: "A central idea brings the important details together."
        },
        {
          prompt: "The library placed popular books on a lower shelf and added clear labels. More students began choosing books without asking for help. What is the central idea?",
          options: ["Good organisation makes resources easier to use", "Popular books are always short", "Students should never ask questions", "Libraries need fewer shelves"],
          correct: 0,
          explanation: "The changes in placement and labels made the books more accessible to students.",
          hint: "Connect what the library changed with what happened next."
        },
        {
          prompt: "A neighbourhood planted native flowers beside the road. Butterflies returned, and the plants needed less watering than the old lawn. Which heading fits best?",
          options: ["Native plants, stronger neighbourhoods", "How to paint a road", "The longest butterfly journey", "Why lawns grow overnight"],
          correct: 0,
          explanation: "The passage is about the environmental benefits of planting native flowers locally.",
          hint: "A good heading should cover both the flowers and their benefits."
        },
        {
          prompt: "Rohan divided a large task into four small steps and finished one each day. By Thursday, the task was complete without a rushed final night. What lesson does the passage emphasise?",
          options: ["Planning makes large tasks manageable", "Thursday has more hours", "Only small tasks can be completed", "Rushing always improves work"],
          correct: 0,
          explanation: "Breaking the task into planned steps helped Rohan complete it steadily.",
          hint: "Focus on the strategy that changed the outcome."
        }
      ],
      checkpoint: {
        prompt: "Asha tested three paper-aircraft designs, changed one fold at a time, and recorded each flight. Her final design travelled farthest. What is the central idea?",
        options: ["Systematic testing improves a design", "Paper is heavier than air", "Only the final flight matters", "Recording results prevents change"],
        correct: 0,
        explanation: "Asha improved the aircraft through controlled changes and recorded tests.",
        hint: "Choose the idea that explains her process and result together."
      }
    },
    {
      id: "reading.inference",
      title: "Infer meaning from evidence in a passage",
      shortTitle: "Textual inference",
      objective: "Combine stated clues with prior knowledge without adding unsupported assumptions.",
      prerequisites: ["reading.central_idea"],
      diagnostic: {
        prompt: "Arjun closed the windows, moved the shoes inside, and carried an umbrella to the door. What can you reasonably infer?",
        options: ["Rain is likely", "It is midnight", "His shoes are new", "He has missed the bus"],
        correct: 0,
        explanation: "Closing windows, moving shoes inside, and preparing an umbrella are clues that rain is expected.",
        hint: "Find one explanation supported by all three actions."
      },
      learning: [
        {
          prompt: "The hall became quiet as Nila unfolded her notes. She took one slow breath before walking to the microphone. How is Nila probably feeling?",
          options: ["Nervous but prepared", "Angry and unprepared", "Sleepy and lost", "Certain the event is cancelled"],
          correct: 0,
          explanation: "Her notes show preparation, while the slow breath before speaking suggests nervousness.",
          hint: "Use both the notes and the slow breath as evidence.",
          instruction: "An inference must be supported by clues, even when it is not stated directly."
        },
        {
          prompt: "When the power returned, everyone cheered and the fans began turning again. What was the room probably like just before this?",
          options: ["Hot and without electricity", "Cold with open windows", "Empty and silent", "Brightly lit by the fans"],
          correct: 0,
          explanation: "The return of power and fans explains both the cheering and the likely heat beforehand.",
          hint: "Work backwards from what changed when power returned."
        },
        {
          prompt: "Leena checked the soil with her finger and left the watering can untouched. What did she most likely notice?",
          options: ["The soil was already moist", "The plant had disappeared", "The watering can was broken", "The pot was made of glass"],
          correct: 0,
          explanation: "Checking the soil and deciding not to water suggests it already had enough moisture.",
          hint: "Her decision follows directly from what she felt in the soil."
        },
        {
          prompt: "The team reread the instructions after their model failed, then noticed that two wires were reversed. What can be inferred?",
          options: ["The wiring error likely caused the failure", "The instructions contained no wiring", "The model was made of paper", "The team had never read before"],
          correct: 0,
          explanation: "Finding reversed wires after a failure provides evidence for the likely cause.",
          hint: "Choose the conclusion directly supported by the discovered error."
        }
      ],
      checkpoint: {
        prompt: "Sara placed a bookmark on page 84 and switched off the lamp only after finishing the paragraph. What can you infer?",
        options: ["She plans to continue reading later", "She dislikes the book", "Page 84 is missing", "The lamp uses sunlight"],
        correct: 0,
        explanation: "The bookmark records where Sara stopped so she can return to the book later.",
        hint: "Think about the usual purpose of a bookmark."
      }
    }
  ]
};

const SOCIAL_SCIENCE: DomainSeed = {
  id: "social-g6-locating-places",
  subject: "Social Science",
  topic: "Locating Places on Earth",
  title: "Read the world through maps",
  description: "Use directions, symbols, and scale to interpret places and relationships on a map.",
  grade: 6,
  reference: "Candidate alignment to NCERT Grade 6 Exploring Society: India and Beyond map-reading themes",
  components: [
    {
      id: "maps.direction",
      title: "Use cardinal and intermediate directions",
      shortTitle: "Direction",
      objective: "Describe relative location using north, south, east, west, and intermediate directions.",
      diagnostic: {
        prompt: "On a standard map, which direction is usually at the top?",
        options: ["North", "South", "East", "West"],
        correct: 0,
        explanation: "Most standard maps are oriented with north at the top.",
        hint: "Recall the conventional orientation used by most maps."
      },
      learning: [
        {
          prompt: "A clinic is directly east of a school. From the clinic, in which direction is the school?",
          options: ["West", "East", "North", "South"],
          correct: 0,
          explanation: "If the clinic is east of the school, the school is west of the clinic.",
          hint: "Reverse the original direction.",
          instruction: "Relative direction changes when the point of view changes."
        },
        {
          prompt: "You face north and turn right. Which direction are you facing now?",
          options: ["East", "West", "South", "North-west"],
          correct: 0,
          explanation: "A right turn from north points east.",
          hint: "Picture a compass with north at the top."
        },
        {
          prompt: "The sports field is south of the library and east of the gate. Where is it from the gate?",
          options: ["East", "West", "North", "North-west"],
          correct: 0,
          explanation: "The statement directly places the sports field east of the gate.",
          hint: "Use only the relationship between the field and the gate."
        },
        {
          prompt: "A river flows from west to east. In which direction is it moving on a standard map?",
          options: ["From left to right", "From right to left", "From top to bottom", "From bottom to top"],
          correct: 0,
          explanation: "West is conventionally on the left and east on the right of a standard map.",
          hint: "Place west and east on a standard compass."
        }
      ],
      checkpoint: {
        prompt: "If a lake is north-west of a village, the village is in which direction from the lake?",
        options: ["South-east", "North-east", "South-west", "North-west"],
        correct: 0,
        explanation: "South-east is the opposite direction of north-west.",
        hint: "Reverse both parts of the original direction."
      }
    }
  ]
};

const COMPUTER_SCIENCE: DomainSeed = {
  id: "computing-g6-algorithmic-thinking",
  subject: "Computer Science",
  topic: "Algorithmic Thinking",
  title: "Think like a problem solver",
  description: "Build precise sequences and use conditions to describe how a solution should behave.",
  grade: 6,
  reference: "Middle-stage computational thinking competencies; locally authored and educator review required",
  components: [
    {
      id: "computing.sequence",
      title: "Build and trace an ordered sequence of instructions",
      shortTitle: "Sequences",
      objective: "Arrange precise instructions and predict the result of following them in order.",
      diagnostic: {
        prompt: "A robot must open a closed door and then enter the room. Which instruction must come first?",
        options: ["Turn the handle", "Walk through the doorway", "Close the door behind it", "Stop inside the room"],
        correct: 0,
        explanation: "The robot must turn the handle before it can open the door and walk through.",
        hint: "Find the action required before the doorway can be used."
      },
      learning: [
        {
          prompt: "Which sequence correctly saves a newly written document?",
          options: ["Choose Save, name the file, confirm", "Confirm, close the app, choose Save", "Name the file, delete it, confirm", "Close the app, restart, type the document"],
          correct: 0,
          explanation: "A sensible save sequence starts the save command, provides a name, and confirms the location or action.",
          hint: "The command must begin before a name can be confirmed.",
          instruction: "An algorithm is a precise sequence whose order affects the result."
        },
        {
          prompt: "Start at 4. Add 3, multiply by 2, then subtract 1. What is the result?",
          options: ["13", "10", "9", "15"],
          correct: 0,
          explanation: "Following the steps in order gives 4 + 3 = 7, 7 × 2 = 14, and 14 − 1 = 13.",
          hint: "Carry the result of each instruction into the next one."
        },
        {
          prompt: "A character repeats: move 2 steps, turn right. What happens after four complete repeats on a square grid?",
          options: ["It returns to its start facing the original direction", "It moves forever in one straight line", "It turns left once", "It moves only one step"],
          correct: 0,
          explanation: "Four equal moves and four right turns trace a square and return to the starting position and direction.",
          hint: "Trace one side of a square for each repeat."
        },
        {
          prompt: "Which instruction is too ambiguous for a computer to follow reliably?",
          options: ["Move a little", "Move forward 3 steps", "Turn right 90 degrees", "Repeat the block twice"],
          correct: 0,
          explanation: "“Move a little” does not specify a measurable distance, so different interpretations are possible.",
          hint: "Computers need instructions with precise quantities or conditions."
        }
      ],
      checkpoint: {
        prompt: "Start at 10. Divide by 2, add 6, then subtract 3. What is the result?",
        options: ["8", "10", "7", "13"],
        correct: 0,
        explanation: "10 ÷ 2 = 5, then 5 + 6 = 11, and 11 − 3 = 8.",
        hint: "Apply one operation at a time in the stated order."
      }
    },
    {
      id: "computing.conditions",
      title: "Use conditions to choose between actions",
      shortTitle: "Conditions",
      objective: "Interpret if–then rules and trace which action occurs when a condition is true or false.",
      prerequisites: ["computing.sequence"],
      diagnostic: {
        prompt: "Rule: IF it is raining, take an umbrella; OTHERWISE, take a cap. It is not raining. What should happen?",
        options: ["Take a cap", "Take an umbrella", "Take both because the rule is unclear", "Do nothing"],
        correct: 0,
        explanation: "Because the condition is false, the OTHERWISE action is followed.",
        hint: "Check whether the IF condition is true before choosing a branch."
      },
      learning: [
        {
          prompt: "Rule: IF score is at least 10, show ‘Level complete’. The score is 12. What appears?",
          options: ["Level complete", "Try again", "Score is below 10", "Nothing can be decided"],
          correct: 0,
          explanation: "Twelve is at least ten, so the condition is true and the completion message appears.",
          hint: "Compare 12 with the boundary value 10.",
          instruction: "A condition evaluates to true or false and selects the corresponding action."
        },
        {
          prompt: "Rule: IF temperature is greater than 30, turn on the fan. At exactly 30, what happens?",
          options: ["The fan stays off", "The fan turns on", "The temperature becomes 31", "The rule repeats forever"],
          correct: 0,
          explanation: "Exactly 30 is not greater than 30, so the condition is false.",
          hint: "“Greater than” does not include equality."
        },
        {
          prompt: "A login succeeds only IF both the username and password are correct. The username is correct but the password is wrong. What happens?",
          options: ["Login fails", "Login succeeds", "Only the username is deleted", "The password becomes correct"],
          correct: 0,
          explanation: "A condition requiring both parts is false when even one part is false.",
          hint: "The word ‘both’ means every required condition must be true."
        },
        {
          prompt: "Which rule best describes a pedestrian signal?",
          options: ["IF green, cross carefully; OTHERWISE, wait", "Always cross", "IF red, run", "Ignore the signal and guess"],
          correct: 0,
          explanation: "The rule connects a safe action to the signal state and gives a clear alternative.",
          hint: "Choose the rule with a clear condition and safe action."
        }
      ],
      checkpoint: {
        prompt: "Rule: IF a number is even, add 5; OTHERWISE, subtract 1. Starting with 8, what is the result?",
        options: ["13", "7", "9", "4"],
        correct: 0,
        explanation: "Eight is even, so the true branch adds five: 8 + 5 = 13.",
        hint: "First decide whether 8 satisfies the condition."
      }
    }
  ]
};

const HINDI: DomainSeed = {
  id: "hindi-g6-reading-comprehension",
  subject: "Hindi",
  topic: "पठन-बोध",
  title: "पढ़ें, समझें, निष्कर्ष निकालें",
  description: "छोटे मौलिक अनुच्छेदों से मुख्य विचार और सन्दर्भ के आधार पर अर्थ समझें।",
  grade: 6,
  reference: "Middle-stage Hindi reading-comprehension competencies; original passages and educator review required",
  components: [
    {
      id: "hindi.main_idea",
      title: "अनुच्छेद का मुख्य विचार पहचानना",
      shortTitle: "मुख्य विचार",
      objective: "विवरणों को जोड़कर अनुच्छेद का सबसे महत्वपूर्ण संदेश पहचानें।",
      diagnostic: {
        prompt: "रीना ने छत पर मिट्टी के कटोरे में पानी रखा। दोपहर में कई पक्षी वहाँ पानी पीने आए। अनुच्छेद का मुख्य विचार क्या है?",
        options: ["छोटा प्रयास पक्षियों की मदद कर सकता है", "सभी पक्षी दोपहर में ही उड़ते हैं", "छत पर मिट्टी नहीं होनी चाहिए", "रीना को कटोरे पसन्द नहीं हैं"],
        correct: 0,
        explanation: "रीना के छोटे-से प्रयास से गर्मी में पक्षियों को पानी मिला।",
        hint: "उस काम और उसके परिणाम को एक साथ बताने वाला विकल्प चुनिए।"
      },
      learning: [
        {
          prompt: "आदित्य रोज़ दस मिनट पौधों को ध्यान से देखता और बदलाव लिखता था। कुछ दिनों में उसने नई पत्तियों के बढ़ने का क्रम समझ लिया। मुख्य विचार क्या है?",
          options: ["नियमित अवलोकन से बदलाव समझे जा सकते हैं", "पत्तियाँ केवल दस मिनट बढ़ती हैं", "लिखना पौधों को रोक देता है", "सभी पौधे एक जैसे होते हैं"],
          correct: 0,
          explanation: "नियमित रूप से देखने और लिखने से आदित्य ने पौधे में होने वाले बदलाव का क्रम समझा।",
          hint: "आदित्य की आदत और उससे मिली समझ को जोड़िए।",
          instruction: "मुख्य विचार पूरे अनुच्छेद को समेटता है, केवल एक विवरण को नहीं।"
        },
        {
          prompt: "कक्षा ने कागज़ के दोनों ओर लिखने का नियम बनाया। महीने के अंत में कूड़ेदान में आधा कागज़ था। सबसे उपयुक्त शीर्षक कौन-सा है?",
          options: ["समझदारी से कागज़ बचाएँ", "महीने का सबसे बड़ा कूड़ेदान", "केवल एक ओर लिखें", "कक्षा में लिखना बन्द करें"],
          correct: 0,
          explanation: "दोनों ओर लिखने की आदत ने कागज़ की बर्बादी कम की।",
          hint: "शीर्षक में नियम और उसके लाभ दोनों की झलक होनी चाहिए।"
        },
        {
          prompt: "फैज़ ने कठिन अध्याय को छोटे भागों में बाँटा और हर भाग के बाद स्वयं से प्रश्न पूछे। परीक्षा से पहले उसे दोहराना आसान लगा। क्या संदेश मिलता है?",
          options: ["योजना बनाकर पढ़ने से समझ और दोहराव आसान होता है", "कठिन अध्याय छोड़ देना चाहिए", "परीक्षा से पहले प्रश्न नहीं पूछने चाहिए", "सभी अध्याय छोटे होते हैं"],
          correct: 0,
          explanation: "भागों में पढ़ने और स्वयं प्रश्न करने की योजना से सीखना व्यवस्थित हुआ।",
          hint: "उस पढ़ाई की विधि को पहचानिए जिसने अन्त में मदद की।"
        },
        {
          prompt: "मोहल्ले के लोगों ने खाली स्थान में स्थानीय पेड़ लगाए। कुछ महीनों बाद वहाँ छाया बढ़ी और चिड़ियाँ लौट आईं। मुख्य विचार क्या है?",
          options: ["स्थानीय पेड़ पर्यावरण को बेहतर बना सकते हैं", "खाली स्थान हमेशा खाली रहना चाहिए", "चिड़ियाँ केवल बड़े शहरों में रहती हैं", "पेड़ कुछ दिनों में गायब हो जाते हैं"],
          correct: 0,
          explanation: "पेड़ लगाने से स्थान पर छाया और पक्षियों की उपस्थिति बढ़ी।",
          hint: "लोगों के काम और पर्यावरण में आए दोनों बदलावों को जोड़िए।"
        }
      ],
      checkpoint: {
        prompt: "सुमन ने बस-स्टॉप पर समय-सारणी पढ़ी और पाँच मिनट पहले घर से निकलने लगी। अब उसकी बस नहीं छूटती। मुख्य विचार क्या है?",
        options: ["जानकारी का सही उपयोग समस्या हल कर सकता है", "बस हमेशा पाँच मिनट देर से आती है", "समय-सारणी पढ़ना कठिन है", "घर से निकलना आवश्यक नहीं है"],
        correct: 0,
        explanation: "समय-सारणी से मिली जानकारी के आधार पर सुमन ने अपनी आदत बदली और समस्या हल की।",
        hint: "जानकारी, बदली हुई आदत और परिणाम को जोड़िए।"
      }
    },
    {
      id: "hindi.context_meaning",
      title: "सन्दर्भ से शब्द और वाक्य का अर्थ समझना",
      shortTitle: "सन्दर्भ का अर्थ",
      objective: "आस-पास के शब्दों और घटनाओं से अपरिचित अभिव्यक्ति का सम्भावित अर्थ निकालें।",
      prerequisites: ["hindi.main_idea"],
      diagnostic: {
        prompt: "‘पहली कोशिश असफल हुई, फिर भी मीरा ने हिम्मत नहीं हारी।’ यहाँ ‘हिम्मत नहीं हारी’ का अर्थ है…",
        options: ["प्रयास जारी रखा", "तुरन्त घर चली गई", "अपना काम भूल गई", "दूसरों को रोक दिया"],
        correct: 0,
        explanation: "असफलता के बाद भी हिम्मत न हारना यानी प्रयास जारी रखना।",
        hint: "वाक्य में असफलता के बाद मीरा के रवैये पर ध्यान दीजिए।"
      },
      learning: [
        {
          prompt: "‘समाचार सुनते ही पूरी कक्षा में उत्साह की लहर दौड़ गई।’ ‘उत्साह की लहर’ का अर्थ क्या है?",
          options: ["सब अचानक बहुत प्रसन्न और उत्साहित हुए", "कक्षा में पानी भर गया", "सभी सो गए", "समाचार सुनाई नहीं दिया"],
          correct: 0,
          explanation: "यह अभिव्यक्ति बताती है कि प्रसन्नता और उत्साह तेजी से सबमें फैल गया।",
          hint: "यहाँ ‘लहर’ वास्तविक पानी नहीं, फैलती हुई भावना है।",
          instruction: "सन्दर्भ बताता है कि किसी अभिव्यक्ति का शाब्दिक नहीं बल्कि भावात्मक अर्थ कब लेना है।"
        },
        {
          prompt: "‘कई दिनों के अभ्यास के बाद कठिन धुन अब नील के लिए बाएँ हाथ का खेल थी।’ इसका अर्थ है…",
          options: ["धुन अब बहुत आसान लगती थी", "नील केवल बाएँ हाथ से बजाता था", "खेल बन्द हो गया", "अभ्यास व्यर्थ था"],
          correct: 0,
          explanation: "‘बाएँ हाथ का खेल’ का अर्थ है ऐसा काम जो अब बहुत आसान लगे।",
          hint: "अभ्यास से कठिनाई कम हुई—उसी के अनुसार अर्थ चुनिए।"
        },
        {
          prompt: "‘बादल घिरते देखकर किसान की आँखों में आशा चमक उठी।’ किसान को किस बात की आशा हुई?",
          options: ["बारिश होने की", "रात होने की", "खेत बेचने की", "बादल गायब होने की"],
          correct: 0,
          explanation: "खेती के सन्दर्भ में घिरते बादल बारिश की सम्भावना और अच्छी फसल की आशा जगाते हैं।",
          hint: "किसान, खेत और बादलों के सम्बन्ध को सोचिए।"
        },
        {
          prompt: "‘रवि ने बहस में ऊँची आवाज़ के बजाय ठोस उदाहरण रखे।’ ‘ठोस उदाहरण’ से क्या तात्पर्य है?",
          options: ["स्पष्ट और भरोसेमन्द उदाहरण", "पत्थर से बने उदाहरण", "बहुत भारी शब्द", "बिना कारण की राय"],
          correct: 0,
          explanation: "यहाँ ‘ठोस’ का अर्थ स्पष्ट, प्रासंगिक और भरोसेमन्द है।",
          hint: "बहस में उदाहरण का काम किसी बात को प्रमाण देना है।"
        }
      ],
      checkpoint: {
        prompt: "‘समस्या बड़ी थी, पर टीम ने एक-एक कदम बढ़ाकर रास्ता निकाल लिया।’ ‘रास्ता निकाल लिया’ का अर्थ है…",
        options: ["समाधान खोज लिया", "नई सड़क बना दी", "जगह छोड़ दी", "समस्या छिपा दी"],
        correct: 0,
        explanation: "सन्दर्भ में ‘रास्ता निकालना’ किसी कठिनाई का समाधान खोजने को कहता है।",
        hint: "समस्या और टीम के क्रमिक प्रयास को साथ पढ़िए।"
      }
    }
  ]
};

export const FOUNDATION_DOMAINS: LearningDomain[] = [
  buildDomain(SCIENCE),
  buildDomain(ENGLISH),
  buildDomain(SOCIAL_SCIENCE),
  buildDomain(COMPUTER_SCIENCE),
  buildDomain(HINDI)
];
