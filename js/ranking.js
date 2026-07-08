class RankingManager {
  constructor(apiBase) {
    this.apiBase = apiBase;
  }

  async fetchRankings(type = 'overall', difficulty = 'all', mode = 'all') {
    try {
      const res = await fetch(`${this.apiBase}/api/rankings?type=${type}&difficulty=${difficulty}&mode=${mode}`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      console.error('Failed to fetch rankings:', e);
      return [];
    }
  }

  async submitScore(data) {
    try {
      const res = await fetch(`${this.apiBase}/api/rankings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to submit score');
      return await res.json();
    } catch (e) {
      console.error('Failed to submit score:', e);
      return { success: false };
    }
  }

  renderRankings(rankings, tbody, opts = {}) {
    tbody.innerHTML = '';

    // Remove old summary if any
    const oldSummary = document.getElementById('mine-summary');
    if (oldSummary) oldSummary.remove();
    
    if (!rankings || rankings.length === 0) {
      document.getElementById('ranking-empty').classList.remove('hidden');
      document.getElementById('ranking-table').classList.add('hidden');
      return;
    }

    document.getElementById('ranking-empty').classList.add('hidden');
    document.getElementById('ranking-table').classList.remove('hidden');

    // Personal mode: show summary stats above table
    if (opts.showPersonalRank && rankings.length > 0) {
      const best = rankings[0].score;
      const avg = Math.round(rankings.reduce((s, e) => s + e.score, 0) / rankings.length);
      const bestCombo = Math.max(...rankings.map(e => e.maxCombo || 0));
      const bestAccuracy = Math.max(...rankings.map(e => e.accuracy || 0));
      
      const summary = document.createElement('div');
      summary.id = 'mine-summary';
      summary.style.cssText = `
        display:flex; gap:1rem; flex-wrap:wrap; justify-content:center;
        margin-bottom:1rem; padding:1rem;
        background:rgba(255,215,0,0.06); border:1px solid rgba(255,215,0,0.2);
        border-radius:8px;
      `;
      summary.innerHTML = `
        <div style="text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-muted);">プレイ回数</div>
          <div style="font-size:1.4rem;font-weight:bold;color:var(--secondary);">${rankings.length}回</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-muted);">ベストスコア</div>
          <div style="font-size:1.4rem;font-weight:bold;color:gold;">${best.toLocaleString()}円</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-muted);">平均スコア</div>
          <div style="font-size:1.4rem;font-weight:bold;">${avg.toLocaleString()}円</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-muted);">最大コンボ</div>
          <div style="font-size:1.4rem;font-weight:bold;color:var(--primary);">${bestCombo}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-muted);">最高正確率</div>
          <div style="font-size:1.4rem;font-weight:bold;color:#4caf50;">${bestAccuracy}%</div>
        </div>
      `;
      document.getElementById('ranking-table-container').prepend(summary);
    }

    const courseNames = { easy: 'お手軽', normal: 'おすすめ', hard: '高級' };
    const tallyConfig = [
      { pts: 300,  color: '#4caf50', label: '300円' },
      { pts: 500,  color: '#2196f3', label: '500円' },
      { pts: 800,  color: '#9c27b0', label: '800円' },
      { pts: 1000, color: '#ff9800', label: '1000円' },
      { pts: 1500, color: '#f44336', label: '1500円' },
    ];

    // Sort by score for personal view
    const displayList = opts.showPersonalRank
      ? [...rankings].sort((a, b) => b.score - a.score)
      : rankings;

    displayList.forEach((entry, index) => {
      const tr = document.createElement('tr');
      
      let rankDisplay;
      if (opts.showPersonalRank) {
        // Personal mode: show personal rank
        const isBest = index === 0;
        rankDisplay = isBest
          ? `<span style="color:gold;">🏆 ${index + 1}位</span>`
          : `<span>${index + 1}位</span>`;
      } else {
        let r = `${index + 1}位`;
        if (index === 0) rankDisplay = `<span class="rank-1">🥇 ${r}</span>`;
        else if (index === 1) rankDisplay = `<span class="rank-2">🥈 ${r}</span>`;
        else if (index === 2) rankDisplay = `<span class="rank-3">🥉 ${r}</span>`;
        else rankDisplay = `<span>${r}</span>`;
      }

      const date = new Date(entry.timestamp).toLocaleDateString('ja-JP');

      // Build plate tally display
      const tally = entry.platesTally || {};
      const tallyHtml = tallyConfig
        .map(c => {
          const count = tally[c.pts] || 0;
          const opacity = count > 0 ? '1' : '0.3';
          return `<span style="
            display:inline-block;
            background:${c.color}22;
            border:1px solid ${c.color};
            color:${c.color};
            border-radius:4px;
            padding:1px 5px;
            font-size:0.72rem;
            margin:1px;
            white-space:nowrap;
            opacity:${opacity};
          ">${c.label}×${count}</span>`;
        })
        .join('');

      // Calculate base score and combo bonus to explain the math
      let baseScore = 0;
      tallyConfig.forEach(c => {
        baseScore += c.pts * (tally[c.pts] || 0);
      });
      const bonusScore = entry.score - baseScore;
      
      let scoreHtml = `<div style="font-size:1.1rem;">${entry.score.toLocaleString()}円</div>`;
      if (baseScore > 0 && bonusScore > 0) {
        scoreHtml += `<div style="font-size:0.75rem; color:#ff9800; margin-top:2px;">(コンボボーナス +${bonusScore.toLocaleString()}円)</div>`;
      }

      tr.innerHTML = `
        <td>${rankDisplay}</td>
        <td style="font-weight:bold;">${escapeHtml(entry.name)}</td>
        <td style="font-family:'Orbitron'; color:var(--secondary);">${scoreHtml}</td>
        <td>${courseNames[entry.difficulty] || entry.difficulty}</td>
        <td>${entry.accuracy}%</td>
        <td>${entry.maxCombo}</td>
        <td style="min-width:160px;">${tallyHtml || '<span style="color:var(--text-muted);font-size:0.8rem;">-</span>'}</td>
        <td>${date}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

function escapeHtml(unsafe) {
  return (unsafe||"").toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const rankingManager = new RankingManager('http://172.23.72.107:3019');
