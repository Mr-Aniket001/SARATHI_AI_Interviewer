
(() => {
  "use strict";
  const toNumber = value => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const formatValue = (value, suffix = "") => {
    const number = toNumber(value);
    return number === null ? "—" : `${number}${suffix}`;
  };
  window.renderSarathiPerformance = function (data) {
    const emptyState = document.getElementById("performanceEmptyState");
    const actualContent = document.getElementById("performanceActualContent");
    if (!emptyState || !actualContent) {
      console.error("SARATHI profile: performance containers were not found.");
      return;
    }
    const count = toNumber(data && data.completedInterviews);
    if (!data || count === null || count <= 0) {
      emptyState.hidden = false;
      actualContent.hidden = true;
      actualContent.replaceChildren();
      return;
    }
    const metrics = [
      ["Completed Interviews", formatValue(count)],
      ["Average Score", formatValue(data.averageScore, "%")],
      ["Improvement", formatValue(data.improvement, "%")]
    ];
    actualContent.replaceChildren();
    actualContent.className = "actual-performance-grid";
    metrics.forEach(([label, value]) => {
      const card = document.createElement("div");
      card.className = "actual-performance-card";
      const title = document.createElement("div");
      title.className = "actual-performance-label";
      title.textContent = label;
      const metric = document.createElement("div");
      metric.className = "actual-performance-value";
      metric.textContent = value;
      card.append(title, metric);
      actualContent.append(card);
    });
    emptyState.hidden = true;
    actualContent.hidden = false;
  };
  document.addEventListener("DOMContentLoaded", () => {
    if (window.SARATHI_PERFORMANCE_DATA) {
      window.renderSarathiPerformance(window.SARATHI_PERFORMANCE_DATA);
    }
  });
})();

