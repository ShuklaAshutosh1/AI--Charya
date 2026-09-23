import { buildDomain, type QuestionSeed } from "./foundationDomains.js";
import type { Grade } from "../domain/types.js";
import type { LearningDomain } from "../domain/learningDomain.js";

// Focused entry paths, not whole-year curriculum coverage. Each grade has its
// own objective and items; no learner-state identifiers are shared across grades.
export function entryPath(grade: Grade, subject: string, topic: string, objective: string, questions: QuestionSeed[]): LearningDomain {
  if (questions.length < 6) throw new Error("An entry path needs separate calibration, practice, and review items.");
  const id = `${subject.toLowerCase().replaceAll(" ", "-")}-g${grade}-${topic.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;
  return buildDomain({id,grade,subject,topic,title:topic,description:objective,
    reference:"AI-Charya original foundation content; NCERT/CBSE mapping and educator approval required",
    components:[{id:`${id}.core`,title:topic,shortTitle:topic,objective,
      diagnostic:questions[0],learning:questions.slice(1,-1),checkpoint:questions.at(-1)!}]});
}

type Row = [string, string, string, string, string, string];
export const questionRows = (rows: Row[]): QuestionSeed[] => rows.map(([prompt,answer,b,c,d,explanation]) => ({prompt,options:[answer,b,c,d],correct:0,explanation,hint:explanation, difficulty:"standard"}));

const paths: LearningDomain[] = [];
const mathTopics = ["", "Adding within twenty", "Two-digit addition", "Equal groups", "Multiplication and division", "Decimal addition", "", "Integer operations", "Solving linear equations"];
for (const grade of [1,2,3,4,5,7,8] as Grade[]) {
  const questions: QuestionSeed[] = Array.from({length:12},(_,index) => {
    const n=index+2;
    let prompt:string, answer:number, explanation:string;
    if (grade===1) {answer=n+3;prompt=`There are ${n} beads. You add 3 beads. How many beads are there now?`;explanation=`Start with ${n} and count 3 more: ${n} + 3 = ${answer}.`;}
    else if (grade===2) {answer=23+n*3;prompt=`What is ${20+n} + ${3+2*n}?`;explanation=`Add the ones, regroup if needed, and add the tens: ${20+n} + ${3+2*n} = ${answer}.`;}
    else if (grade===3) {answer=n*4;prompt=`There are ${n} bags with 4 marbles in each bag. How many marbles are there altogether?`;explanation=`${n} equal groups of 4 give ${n} × 4 = ${answer}.`;}
    else if (grade===4) {answer=n*3;prompt=`${n*12} pencils are shared equally among 4 children. How many pencils does each child get?`;explanation=`Divide the total into four equal groups: ${n*12} ÷ 4 = ${answer}.`;}
    else if (grade===5) {answer=(n*10+17)/10;prompt=`What is ${(n/1).toFixed(1)} + 1.7?`;explanation=`Align the decimal points: ${n}.0 + 1.7 = ${answer.toFixed(1)}.`;}
    else if (grade===7) {answer=3-n;prompt=`What is −${n+4} + 7?`;explanation=`From −${n+4}, move 7 places toward the positive direction to reach ${answer}.`;}
    else {answer=n;prompt=`Solve 3x + 5 = ${3*n+5}. What is x?`;explanation=`Subtract 5 from both sides to get 3x = ${3*n}, then divide both sides by 3: x = ${n}.`;}
    return {prompt,options:[answer,answer+1,answer+2,answer+3].map(String),correct:0,explanation,
      hint: grade===8 ? "Apply the same inverse operation to both sides of the equation." : grade===7 ? "Use the number line and keep track of the sign." : "Identify the operation from the quantities, then calculate one step at a time.",difficulty:"standard"};
  });
  paths.push(entryPath(grade,"Mathematics",mathTopics[grade],`Practise ${mathTopics[grade].toLowerCase()} using quantities and clear reasoning.`,questions));
}

const english: Record<number,{topic:string;rows:Row[]}> = {
  1:{topic:"Words in simple sentences",rows:[
    ["A cat can ___.","run","blue","under","three","Run names an action a cat can do."],
    ["We drink ___.","water","chair","stone","shoe","Water is something we drink."],
    ["The sun is in the ___.","sky","cup","bag","box","We see the sun in the sky."],
    ["I read a ___.","book","spoon","sock","ball","A book contains words we read."],
    ["A bird has ___.","wings","wheels","pages","handles","Wings help a bird fly."],
    ["We wear shoes on our ___.","feet","hands","ears","eyes","Shoes cover and protect our feet."]]},
  2:{topic:"Singular and plural nouns",rows:[
    ["One cat, two ___.","cats","cates","cat","cating","Add s to cat to name more than one cat."],
    ["One box, three ___.","boxes","boxs","box","boxies","Words ending in x usually add es."],
    ["One bus, two ___.","buses","buss","bus","busing","Bus adds es to form buses."],
    ["One dog, four ___.","dogs","doges","dog","dogies","Dog adds s to form dogs."],
    ["One dish, five ___.","dishes","dishs","dish","dishing","Words ending in sh usually add es."],
    ["One book, six ___.","books","bookes","book","bookies","Book adds s to form books."]]},
  3:{topic:"Simple present agreement",rows:[
    ["She ___ to school every day.","walks","walk","walking","walked yesterday","She takes walks in the simple present."],
    ["They ___ football after school.","play","plays","playing","is play","They takes the base verb play."],
    ["My brother ___ milk each morning.","drinks","drink","drinking","are drink","A singular subject takes drinks."],
    ["We ___ near the park.","live","lives","living","is live","We takes the base verb live."],
    ["The dog ___ when the bell rings.","barks","bark","barking","are bark","The singular dog takes barks."],
    ["I ___ my bag every evening.","pack","packs","packing","is pack","I takes the base verb pack."]]},
  4:{topic:"Choosing past-tense verbs",rows:[
    ["Yesterday, Meena ___ to the library.","went","go","goes","going","Went is the past tense of go."],
    ["Last night, we ___ a story.","read","reads","reading","are read","Read is also the past form, pronounced red."],
    ["Two days ago, he ___ a letter.","wrote","writes","write","writing","Wrote is the past tense of write."],
    ["Yesterday, the children ___ a sandcastle.","built","builds","build","building","Built is the past tense of build."],
    ["Last week, I ___ my lost pencil.","found","find","finds","finding","Found is the past tense of find."],
    ["Yesterday, Sara ___ a picture.","drew","draws","draw","drawing","Drew is the past tense of draw."]]},
  5:{topic:"Connect ideas with conjunctions",rows:[
    ["I stayed indoors ___ it was raining.","because","although","or","unless","Because introduces the reason for staying indoors."],
    ["Would you like milk ___ water?","or","because","although","unless","Or presents alternatives."],
    ["She was tired, ___ she finished her work.","but","because","or","if","But contrasts tiredness with continuing the work."],
    ["We bought pencils ___ notebooks.","and","although","unless","because","And joins the two items."],
    ["___ you practise, you will improve.","If","But","Or","And","If introduces a condition."],
    ["___ the bag was heavy, he carried it carefully.","Although","Because of","Or","Unless","Although introduces a contrast between the difficulty and action."]]},
  7:{topic:"Active and passive voice",rows:[
    ["Choose the passive form of ‘Riya writes a letter.’","A letter is written by Riya.","Riya is writing a letter.","A letter writes Riya.","Riya wrote a letter.","The object becomes the subject; present simple passive uses is written."],
    ["Choose the passive form of ‘They cleaned the room.’","The room was cleaned by them.","They clean the room.","The room cleaned them.","The room is cleaning.","Past simple passive uses was cleaned."],
    ["Choose the active form of ‘The ball was caught by Aman.’","Aman caught the ball.","The ball caught Aman.","Aman is caught.","Aman will catch the ball.","Aman is the doer and caught preserves the past tense."],
    ["Choose the passive form of ‘The chef cooks rice.’","Rice is cooked by the chef.","Rice cooks the chef.","Rice was cooking.","The chef is rice.","Present simple passive uses is cooked."],
    ["Choose the active form of ‘The song is sung by Tara.’","Tara sings the song.","Tara sang the song.","The song sings Tara.","Tara will sing.","Tara is the doer and sings preserves the present tense."],
    ["Choose the passive form of ‘They opened the gate.’","The gate was opened by them.","The gate opens them.","They are opening.","The gate will open them.","The past action is expressed with was opened."]]},
  8:{topic:"Reported statements",rows:[
    ["Report later: Ravi said, ‘I am tired.’","Ravi said that he was tired.","Ravi said that I am tired.","Ravi said that he is tiring.","Ravi asked whether tired.","I changes to he, and am backshifts to was in this past report."],
    ["Report later: Mira said, ‘I have finished.’","Mira said that she had finished.","Mira said that I finished.","Mira said that she has finish.","Mira says she finishes tomorrow.","Have finished backshifts to had finished; I refers to Mira."],
    ["Report later: Dev said, ‘I will help.’","Dev said that he would help.","Dev said that I will help.","Dev asked to helped.","Dev said he would helped.","Will becomes would, followed by the base verb help."],
    ["Report later: Tara said, ‘I can swim.’","Tara said that she could swim.","Tara said that I can swim.","Tara said that she could swam.","Tara said swimming she.","Can backshifts to could, followed by swim."],
    ["Report the next day: Aman said, ‘I am leaving today.’","Aman said that he was leaving that day.","Aman said I leave today.","Aman said that he was left.","Aman says yesterday leaving.","Am becomes was and today becomes that day when reported later."],
    ["Report later: Nila said, ‘I was reading.’","Nila said that she had been reading.","Nila said that I was reading.","Nila says she reads.","Nila said she had reading.","Past continuous backshifts to had been reading in this report."]]}
};
for (const [grade,data] of Object.entries(english)) paths.push(entryPath(Number(grade) as Grade,"English",data.topic,`Use ${data.topic.toLowerCase()} accurately in context.`,questionRows(data.rows)));

const hindi: Record<number,{topic:string; pairs:[string,string][]; alternatives:string[]}> = {
  1:{topic:"Hindi familiar words",pairs:[["हम पानी किससे पीते हैं?","गिलास"],["हम किससे लिखते हैं?","पेंसिल"],["हम किसमें पढ़ते हैं?","किताब"],["हम पैरों में क्या पहनते हैं?","जूते"],["हम फल किसमें रखते हैं?","टोकरी"],["हम बारिश में क्या खोलते हैं?","छाता"]],alternatives:["पत्थर","तारा","बादल"]},
  2:{topic:"Hindi opposite words",pairs:[["दिन का विलोम शब्द क्या है?","रात"],["ऊपर का विलोम क्या है?","नीचे"],["बड़ा का विलोम क्या है?","छोटा"],["गरम का विलोम क्या है?","ठंडा"],["अन्दर का विलोम क्या है?","बाहर"],["नया का विलोम क्या है?","पुराना"]],alternatives:["पेड़","किताब","पानी"]},
  3:{topic:"Hindi naming words",pairs:[["‘रीना खेलती है।’ में संज्ञा कौन-सी है?","रीना"],["‘बिल्ली सोती है।’ में संज्ञा कौन-सी है?","बिल्ली"],["‘फूल खिलता है।’ में संज्ञा कौन-सी है?","फूल"],["‘नदी बहती है।’ में संज्ञा कौन-सी है?","नदी"],["‘पक्षी उड़ता है।’ में संज्ञा कौन-सी है?","पक्षी"],["‘सूरज चमकता है।’ में संज्ञा कौन-सी है?","सूरज"]],alternatives:["है","बहुत","धीरे"]},
  4:{topic:"Hindi pronouns",pairs:[["‘रीना आई। वह बैठी।’ में सर्वनाम कौन-सा है?","वह"],["‘मैं स्कूल जाता हूँ।’ में सर्वनाम कौन-सा है?","मैं"],["‘तुम पुस्तक पढ़ो।’ में सर्वनाम कौन-सा है?","तुम"],["‘हम साथ खेलते हैं।’ में सर्वनाम कौन-सा है?","हम"],["‘यह मेरा घर है।’ में संकेत करने वाला सर्वनाम कौन-सा है?","यह"],["‘वे मैदान में हैं।’ में सर्वनाम कौन-सा है?","वे"]],alternatives:["किताब","खेलना","सुन्दर"]},
  5:{topic:"Hindi describing words",pairs:[["‘लाल फूल खिला।’ में विशेषण कौन-सा है?","लाल"],["‘मीठा आम खाओ।’ में विशेषण कौन-सा है?","मीठा"],["‘लम्बा पेड़ दिखा।’ में विशेषण कौन-सा है?","लम्बा"],["‘ठंडा पानी पियो।’ में विशेषण कौन-सा है?","ठंडा"],["‘छोटी चिड़िया उड़ी।’ में विशेषण कौन-सा है?","छोटी"],["‘साफ कमरा अच्छा है।’ में ‘कमरा’ की विशेषता बताने वाला शब्द कौन-सा है?","साफ"]],alternatives:["पढ़ना","वह","और"]},
  7:{topic:"Hindi contextual synonyms",pairs:[["‘जल बचाओ।’ में जल का समानार्थी शब्द क्या है?","पानी"],["‘वन हरा है।’ में वन का समानार्थी शब्द क्या है?","जंगल"],["‘सूर्य निकला।’ में सूर्य का समानार्थी शब्द क्या है?","सूरज"],["‘पृथ्वी घूमती है।’ में पृथ्वी का समानार्थी शब्द क्या है?","धरती"],["‘वायु चलती है।’ में वायु का समानार्थी शब्द क्या है?","हवा"],["‘मित्र आया।’ में मित्र का समानार्थी शब्द क्या है?","दोस्त"]],alternatives:["विपरीत अर्थ","संख्या","विराम"]},
  8:{topic:"Hindi idioms in context",pairs:[["‘सफल होकर उसने परिवार का नाम रोशन किया।’ का अर्थ क्या है?","सम्मान बढ़ाया"],["‘खबर सुनकर उसके होश उड़ गए।’ का अर्थ क्या है?","बहुत घबरा गया"],["‘यह काम उसके बाएँ हाथ का खेल है।’ का अर्थ क्या है?","बहुत आसान काम"],["‘गलती देखकर उसकी आँखें खुल गईं।’ का अर्थ क्या है?","सच्चाई समझ में आई"],["‘कठिन समय में भी उसने हिम्मत नहीं हारी।’ का अर्थ क्या है?","प्रयास जारी रखा"],["‘टीम ने आखिर रास्ता निकाल लिया।’ का अर्थ क्या है?","समाधान खोज लिया"]],alternatives:["शब्द का केवल शाब्दिक अर्थ","बिना सन्दर्भ अनुमान","कोई अर्थ नहीं"]}
};
for (const [grade,data] of Object.entries(hindi)) paths.push(entryPath(Number(grade) as Grade,"Hindi",data.topic,"वाक्य और सन्दर्भ में शब्दों का अर्थ तथा उपयोग पहचानें।",data.pairs.map(([prompt,answer],index)=>({prompt,options:[answer,...[1,2,3].map((offset)=>data.pairs[(index+offset)%data.pairs.length][1])],correct:0,explanation:`इस वाक्य के सन्दर्भ में ‘${answer}’ प्रश्न का उत्तर देता है। अन्य विकल्प इस वाक्य के अर्थ या शब्द-भूमिका से मेल नहीं खाते।`,hint:"पूरा वाक्य पढ़ें और शब्द की भूमिका या भाव पर ध्यान दें।"}))));

export const GRADE_LANGUAGE_MATH_PATHS = paths;
