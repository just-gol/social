import { APP_FEATURES } from "../lib/constants";

export function FeatureBoard() {
  return (
    <section className="card">
      <div>
        <h2>Quest Board</h2>
        <p className="muted">
          These are the next zones to unlock. Each one should become a real page,
          not just another settings panel.
        </p>
      </div>
      <div className="feature-grid">
        {APP_FEATURES.map((feature, index) => (
          <div className="feature-item" key={feature.title}>
            <span className="feature-kicker">0{index + 1}</span>
            <strong>{feature.title}</strong>
            <span className="muted">{feature.body}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
