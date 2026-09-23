import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../components/Brand";
import { api, ApiError } from "../lib/api";
import { storeLearnerSession } from "../lib/session";

export function OnboardingPage() {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const learner = await api.createLearner({ name, grade });
      storeLearnerSession(learner.id, learner.accessToken);
      navigate("/home");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not create the learner profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding">
      <header className="onboarding__header">
        <Link to="/" className="icon-button" aria-label="Back to landing page"><ArrowLeft size={18} /></Link>
        <Brand />
        <span />
      </header>
      <main className="onboarding__main">
        <section className="onboarding__intro">
          <span className="step-label">Learning profile</span>
          <h1>Let’s create your starting point.</h1>
          <p>
            Your profile keeps progress and recommendations connected whenever you return.
          </p>
          <ul className="plain-checks">
            <li><Check size={17} /> Progress shown skill by skill</li>
            <li><Check size={17} /> Personalised practice and review</li>
            <li><Check size={17} /> Help available when you need it</li>
          </ul>
        </section>
        <form className="onboarding-form" onSubmit={submit}>
          <div className="form-heading">
            <h2>Create learner profile</h2>
            <p>Tell us how you would like to learn.</p>
          </div>
          <label>
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="How should we address you?"
              autoComplete="name"
              required
            />
          </label>
          <fieldset>
            <legend>Grade</legend>
            <div className="grade-picker">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                <button
                  type="button"
                  key={value}
                  className={grade === value ? "selected" : ""}
                  onClick={() => setGrade(value)}
                >
                  <span>Grade</span>{value}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="form-heading">Grade {grade} foundation paths are available across six learning areas.</p>
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <p>
              Your learning profile keeps your progress together and can be changed from Profile & Privacy.
            </p>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary button--wide" disabled={loading}>
            {loading ? "Creating profile…" : "Continue"} <ArrowRight size={17} />
          </button>
        </form>
      </main>
    </div>
  );
}
