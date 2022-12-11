let colors = ["b942f5", "5af542", "f5d742"];

let gamePlayers = [];
let screenEntities = [];

(async () => {
  let canvas = document.getElementById("map");
  let ctx = canvas.getContext("2d");

  let mousePos = { x: 0, y: 0 };

  let map = document.getElementById("mapasset");

  canvas.addEventListener("mousemove", (e) => {
    mousePos.x = e.offsetX;
    mousePos.y = e.offsetY;
  });

  // Map reload
  setInterval(reloadMap, 1);
  setInterval(async () => {
    gamePlayers = await listOnlinePlayers();
  }, 1000); // Every 5 seconds

  async function reloadMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(map, 0, 0, canvas.width, canvas.height);

    let closestPlayerToCursor = null;

    // Determine which player is closest to the cursor
    for (player of gamePlayers) {
      let playerPos = await gamePosToCanvasPos(player.position);
      let distance = Math.sqrt(
        Math.pow(mousePos.x - playerPos.x, 2) +
          Math.pow(mousePos.y - playerPos.y, 2)
      );
      if (
        closestPlayerToCursor == null ||
        distance < closestPlayerToCursor.distance
      ) {
        closestPlayerToCursor = {
          player: player.id,
          distance,
        };
      }
    }

    for (player of gamePlayers) {
      let playerPos = await gamePosToCanvasPos(player.position);
      ctx.beginPath();
      ctx.arc(playerPos.x, playerPos.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#" + player.color;
      ctx.fill();
      ctx.stroke();

      // Calculate distance to mouse
      let distance = Math.sqrt(
        Math.pow(mousePos.x - playerPos.x, 2) +
          Math.pow(mousePos.y - playerPos.y, 2)
      );

      if (distance < 20 && closestPlayerToCursor) {
        let toolTip = await createToolTip(
          player.name,
          "#" + colors[gamePlayers.indexOf(player) % colors.length]
        );
        ctx.drawImage(toolTip, mousePos.x, mousePos.y);
      }
    }

    for (entity of screenEntities) {
      if (entity.frame > 300) {
        screenEntities.splice(screenEntities.indexOf(entity), 1);
        continue;
      } else {
        let pulse = createPulse(entity.frame);
        let pulsePos = await gamePosToCanvasPos({
          x: entity.x - 145,
          y: 0,
          z: entity.y + 145,
        });
        ctx.drawImage(pulse, pulsePos.x, pulsePos.y);
        entity.frame++;
      }
    }
  }

  function createPulse(frame) {
    if (frame > 300) return null;
    // Create 75x75 pulse effect that lasts 300 frames and then disappears
    let canvas = document.createElement("canvas");
    canvas.width = 75;
    canvas.height = 75;
    let ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(37.5, 37.5, 37.5 - frame / 10, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 255, 255, " + (1 - frame / 300) + ")";
    ctx.fill();
    ctx.stroke();

    return canvas;
  }

  async function createToolTip(text, borderColor = "orange") {
    let padding = 2;
    // Create canvas with text and orange border
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    ctx.font = "20px Arial";
    let textWidth = ctx.measureText(text).width;
    canvas.width = textWidth + 40;
    canvas.height = 40;
    ctx.font = "20px Arial";
    ctx.fillStyle = "#454545";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // create border with padding as border and borderColor as fill
    ctx.fillStyle = borderColor;
    ctx.fillRect(0, 0, padding, canvas.height);
    ctx.fillRect(0, 0, canvas.width, padding);
    ctx.fillRect(canvas.width - padding, 0, padding, canvas.height);
    ctx.fillRect(0, canvas.height - padding, canvas.width, padding);

    // create text
    ctx.fillStyle = "white";
    ctx.fillText(text, 20, 30);

    return canvas;
  }

  async function listOnlinePlayers() {
    let payload = await loadPlayerPos();
    let server = payload.server;
    let players = [];

    document.getElementById("playerList").innerHTML = "";

    for (key of Object.keys(payload)) {
      if (key === "server") continue;
      let value = payload[key];

      let location = value.lastSeenLocation;
      let locationArray = location.split(",");
      let x = parseFloat(locationArray[0].replace("(", ""));
      let y = parseFloat(locationArray[1]);
      let z = parseFloat(locationArray[2].replace(")", ""));
      value.position = { x, y, z };

      let color = colors[players.length % colors.length];

      if (value.lastSeen == server.lastSeen) {
        players.push({
          id: key,
          color: color,
          ...value,
        });

        let liElement = document.createElement("li");
        liElement.style.borderLeft = `5px solid #${color}`;
        liElement.onclick = () => {
          screenEntities.push({
            x: value.position.x,
            y: value.position.z,
            frame: 0,
          });
        };
        liElement.innerHTML = value.name;

        document.getElementById("playerList").appendChild(liElement);
      }
    }

    return players;
  }

  async function loadPlayerPos() {
    return (await fetch("http://rosella.stelch.net/rustpos.json")).json();
  }

  async function gamePosToCanvasPos(pos) {
    let x = (pos.x / 3750) * canvas.width + canvas.width / 2;
    let y = (pos.z / 3750) * canvas.height + canvas.height / 2;

    // rotate 180 degrees
    x = canvas.width - x;
    y = canvas.height - y;

    // flip
    x = canvas.width - x;

    return { x, y };
  }
})();
