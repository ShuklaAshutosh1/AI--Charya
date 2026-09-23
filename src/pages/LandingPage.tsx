import { ArrowDownRight, ArrowRight, Asterisk, MoveUpRight } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Brand } from "../components/Brand";
import { getStoredLearnerId } from "../lib/session";

const subjects = ["Mathematics", "Science", "English", "Social Science", "Computer Science", "Hindi"];

export function LandingPage() {
  if (getStoredLearnerId()) return <Navigate to="/home" replace />;

  return (
    <div className="launch-landing">
      <header className="launch-nav">
        <Brand />
        <div className="launch-nav__meta"><span>Grades 1—8</span><span>India</span></div>
        <Link className="launch-link" to="/onboarding">Enter your learning space <MoveUpRight size={16} /></Link>
      </header>

      <main>
        <section className="launch-stage">
          <div className="launch-stage__copy">
            <span className="launch-index">01 / LEARNING, RECOMPOSED</span>
            <h1><span>Learn with</span><em>direction.</em></h1>
            <p>One learning space that notices what you understand, plans the next useful move, and helps when the path gets difficult.</p>
            <div className="launch-stage__actions">
              <Link className="button button--signal" to="/onboarding">Begin your path <ArrowRight size={17} /></Link>
              <a href="#learning-system" className="launch-scroll">Explore the system <ArrowDownRight size={16} /></a>
            </div>
          </div>

          <div className="learning-orbit" aria-hidden="true">
            <div className="learning-orbit__halo" />
            <div className="learning-orbit__ring learning-orbit__ring--one"><i /></div>
            <div className="learning-orbit__ring learning-orbit__ring--two"><i /></div>
            <div className="learning-orbit__core"><span>अ</span><small>YOUR PATH</small></div>
            <span className="orbit-label orbit-label--math">MATHEMATICS</span>
            <span className="orbit-label orbit-label--science">SCIENCE</span>
            <span className="orbit-label orbit-label--language">LANGUAGE</span>
            <span className="orbit-label orbit-label--world">THE WORLD</span>
          </div>

          <div className="launch-stage__foot">
            <span>Adaptive pathways</span>
            <span>Contextual guidance</span>
            <span>Progress you can explain</span>
          </div>
        </section>

        <section className="launch-subjects" id="learning-system">
          <div className="launch-section-title">
            <span>02 / ONE CONNECTED SPACE</span>
            <h2>Six ways to understand the world.</h2>
            <p>Your subjects do not live in separate boxes. AI-Charya keeps a clear view of each skill while helping you move across a wider learning journey.</p>
          </div>
          <div className="launch-subject-index">
            {subjects.map((subject, index) => (
              <div key={subject}><span>{String(index + 1).padStart(2, "0")}</span><strong>{subject}</strong><Asterisk size={16} /></div>
            ))}
          </div>
        </section>

        <section className="launch-method">
          <div className="launch-method__lead"><span>03 / HOW IT MOVES</span><h2>A quieter kind of intelligence.</h2></div>
          <div className="launch-method__steps">
            <article><span>01</span><h3>Find the starting point</h3><p>A short learning calibration maps what is already secure and what needs attention.</p></article>
            <article><span>02</span><h3>Choose the next move</h3><p>An explicit learning plan connects prerequisites, practice needs, and your current goal.</p></article>
            <article><span>03</span><h3>Help without taking over</h3><p>The companion can clarify, hint, or guide while keeping assessment and progress trustworthy.</p></article>
          </div>
        </section>
      </main>

      <footer className="launch-footer"><Brand compact /><p>Built for serious, curious learners.</p><Link to="/onboarding">Start learning <ArrowRight size={15} /></Link></footer>
    </div>
  );
}
