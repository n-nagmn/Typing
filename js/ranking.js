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

      tr.innerHTML = `
        <td>${rankDisplay}</td>
        <td style="font-weight:bold;">${escapeHtml(entry.name)}</td>
        <td style="font-family:'Orbitron'; color:var(--secondary); font-size:1.1rem;">${entry.score.toLocaleString()}円</td>
        <td>${courseNames[entry.difficulty] || entry.difficulty}</td>
        <td>${entry.accuracy}%</td>
        <td>${entry.maxCombo}</td>
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
