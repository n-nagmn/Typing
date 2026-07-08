class RankingManager {
  constructor(apiBase) {
    this.apiBase = apiBase;
  }

  async fetchRankings(type = 'overall', difficulty = 'all') {
    try {
      const res = await fetch(`${this.apiBase}/api/rankings?type=${type}&difficulty=${difficulty}`);
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

  renderRankings(rankings, tbody) {
    tbody.innerHTML = '';
    
    if (!rankings || rankings.length === 0) {
      document.getElementById('ranking-empty').classList.remove('hidden');
      document.getElementById('ranking-table').classList.add('hidden');
      return;
    }

    document.getElementById('ranking-empty').classList.add('hidden');
    document.getElementById('ranking-table').classList.remove('hidden');

    rankings.forEach((entry, index) => {
      const tr = document.createElement('tr');
      
      let rankDisplay = `${index + 1}位`;
      if (index === 0) rankDisplay = `<span class="rank-1">🥇 ${rankDisplay}</span>`;
      else if (index === 1) rankDisplay = `<span class="rank-2">🥈 ${rankDisplay}</span>`;
      else if (index === 2) rankDisplay = `<span class="rank-3">🥉 ${rankDisplay}</span>`;
      else rankDisplay = `<span>${rankDisplay}</span>`;

      const courseNames = { easy: 'お手軽', normal: 'おすすめ', hard: '高級' };
      const date = new Date(entry.timestamp).toLocaleDateString('ja-JP');

      // Build plate tally display
      const tally = entry.platesTally || {};
      const tallyConfig = [
        { pts: 300,  color: '#4caf50', label: '300円' },
        { pts: 500,  color: '#2196f3', label: '500円' },
        { pts: 800,  color: '#9c27b0', label: '800円' },
        { pts: 1000, color: '#ff9800', label: '1000円' },
        { pts: 1500, color: '#f44336', label: '1500円' },
      ];
      const tallyHtml = tallyConfig
        .filter(c => tally[c.pts] > 0)
        .map(c => `<span style="
          display:inline-block;
          background:${c.color}22;
          border:1px solid ${c.color};
          color:${c.color};
          border-radius:4px;
          padding:1px 5px;
          font-size:0.72rem;
          margin:1px;
          white-space:nowrap;
        ">${c.label}×${tally[c.pts]}</span>`)
        .join('');

      tr.innerHTML = `
        <td>${rankDisplay}</td>
        <td style="font-weight:bold;">${escapeHtml(entry.name)}</td>
        <td style="font-family:'Orbitron'; color:var(--secondary); font-size:1.1rem;">${entry.score.toLocaleString()}円</td>
        <td>${courseNames[entry.difficulty] || entry.difficulty}</td>
        <td>${entry.accuracy}%</td>
        <td>${entry.maxCombo}</td>
        <td style="max-width:180px;">${tallyHtml || '<span style="color:var(--text-muted);font-size:0.8rem;">-</span>'}</td>
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
