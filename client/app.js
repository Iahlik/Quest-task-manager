document.addEventListener('DOMContentLoaded', () => {
  const missionTitleInput = document.getElementById('mission-title');
  const missionDifficultySelect = document.getElementById('mission-difficulty');
  const missionRewardInput = document.getElementById('mission-reward');
  const addMissionBtn = document.getElementById('add-mission');

  const rewardTitleInput = document.getElementById('reward-title');
  const rewardPointsInput = document.getElementById('reward-points');
  const addRewardBtn = document.getElementById('add-reward');

  const missionList = document.getElementById('mission-list');
  const rewardList = document.getElementById('reward-list');
  const totalPointsElement = document.getElementById('total-points');

  // Cargar misiones, recompensas y puntos totales al inicio
  fetchMissions();
  fetchRewards();
  fetchTotalPoints();

  // Agregar misión
  addMissionBtn.addEventListener('click', () => {
    const title = missionTitleInput.value.trim();
    const difficulty = missionDifficultySelect.value;
    const rewardPoints = parseInt(missionRewardInput.value, 10);

    if (title && rewardPoints > 0) {
      addMission(title, difficulty, rewardPoints);
      missionTitleInput.value = '';
      missionRewardInput.value = '';
    }
  });

  // Agregar recompensa
  addRewardBtn.addEventListener('click', () => {
    const description = rewardTitleInput.value.trim();
    const pointsRequired = parseInt(rewardPointsInput.value, 10);

    if (description && pointsRequired > 0) {
      addReward(description, pointsRequired);
      rewardTitleInput.value = '';
      rewardPointsInput.value = '';
    }
  });

  // Función para obtener misiones
  function fetchMissions() {
    fetch('/api/missions')
      .then(response => {
        if (!response.ok) {
          throw new Error('Error en la solicitud: ' + response.status);
        }
        return response.json();
      })
      .then(missions => {
        missionList.innerHTML = '';
        missions.forEach(mission => {
          const div = document.createElement('div');
          div.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
          div.innerHTML = `
            <span>${mission.title} - ${mission.difficulty} (${mission.reward_points} puntos)</span>
            <button class="btn btn-danger btn-sm" onclick="completeMission(${mission.id})">Completar</button>
          `;
          missionList.appendChild(div);
        });
      })
      .catch(error => {
        console.error('Error al cargar misiones:', error);
      });
  }

  // Función para obtener recompensas
  function fetchRewards() {
    fetch('/api/rewards')
      .then(response => {
        if (!response.ok) {
          throw new Error('Error en la solicitud: ' + response.status);
        }
        return response.json();
      })
      .then(rewards => {
        rewardList.innerHTML = '';
        rewards.forEach(reward => {
          const div = document.createElement('div');
          div.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
          div.innerHTML = `
            <span>${reward.description} - Requiere ${reward.points_required} puntos</span>
            <button class="btn btn-success btn-sm" onclick="redeemReward(${reward.id})">Canjear</button>
          `;
          rewardList.appendChild(div);
        });
      })
      .catch(error => {
        console.error('Error al cargar recompensas:', error);
      });
  }

  // Función para obtener puntos totales
  function fetchTotalPoints() {
    fetch('/api/player')
      .then(response => {
        if (!response.ok) {
          throw new Error('Error en la solicitud: ' + response.status);
        }
        return response.json();
      })
      .then(player => {
        totalPointsElement.textContent = player.total_points;
      })
      .catch(error => {
        console.error('Error al cargar puntos:', error);
      });
  }

  function addMission(title, difficulty, reward_points) {
    fetch('/api/missions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, difficulty, reward_points }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Error al agregar misión: ' + response.statusText);
        }
        return response.json();
      })
      .then(() => fetchMissions())
      .catch(error => console.error('Error:', error));
  }
  // Función para agregar recompensa
  function addReward(description, points_required) {
    fetch('/api/rewards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description, points_required }),
    })
      .then(response => response.json())
      .then(() => fetchRewards());
  }

  // Completar misión y agregar puntos
  window.completeMission = function (id) {
    fetch(`/api/missions/${id}/complete`, {
      method: 'PUT',
    })
      .then(() => {
        fetchMissions();
        fetchTotalPoints();
      })
      .catch(error => {
        console.error('Error al completar misión:', error);
      });
  };

  // Canjear recompensa
  window.redeemReward = function (id) {
    fetch(`/api/rewards/${id}/redeem`, {
      method: 'POST',
    })
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          alert(data.message);
        }
        fetchRewards();
        fetchTotalPoints();
      })
      .catch(error => {
        console.error('Error al canjear recompensa:', error);
      });
  };

  // Resetear misiones, recompensas y puntos totales
  window.resetAll = function () {
    fetch('/api/rewards/reset', {
      method: 'DELETE',
    })
      .then(() => {
        fetchMissions();
        fetchRewards();
        fetchTotalPoints();
      })
      .catch(error => {
        console.error('Error al resetear todo:', error);
      });
  };
});
