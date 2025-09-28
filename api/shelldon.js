<!-- Shelldon Chat Widget Start -->
<div id="shelldon-bubble" style="position:fixed; bottom:20px; right:20px; width:60px; height:60px; background:#27ae60; border-radius:50%; box-shadow:0 4px 10px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:9999;">
  <span style="color:white; font-size:28px;">💬</span>
</div>

<div id="shelldon-chat" style="position:fixed; bottom:90px; right:20px; width:320px; max-height:500px; background:white; border:1px solid #ddd; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.15); display:none; flex-direction:column; font-family:Arial, sans-serif; z-index:9999; overflow:hidden;">
  <div style="background:#27ae60; color:white; padding:12px; font-weight:bold; font-size:16px; display:flex; justify-content:space-between; align-items:center;">
    <span>💬 Shelldon</span>
    <span id="shelldon-close" style="cursor:pointer; font-size:18px;">✖</span>
  </div>
  <div id="chat-body" style="flex:1; padding:12px; overflow-y:auto; font-size:14px; display:flex; flex-direction:column;"></div>
  <div style="display:flex; border-top:1px solid #ddd;">
    <input id="chat-input" type="text" placeholder="Ask me anything..." style="flex:1; border:none; padding:10px; font-size:14px; outline:none;">
    <button id="chat-send" style="background:#27ae60; color:white; border:none; padding:0 16px; cursor:pointer;">Send</button>
  </div>
</div>

<script>
(function() {
  const bubble = document.getElementById("shelldon-bubble");
  const chat = document.getElementById("shelldon-chat");
  const closeBtn = document.getElementById("shelldon-close");
  const body = document.getElementById("chat-body");
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");

  bubble.onclick = () => { chat.style.display = "flex"; bubble.style.display = "none"; };
  closeBtn.onclick = () => { chat.style.display = "none"; bubble.style.display = "flex"; };

  function addMessage(content, sender) {
    const msg = document.createElement("div");
    msg.style.margin = "6px 0";
    msg.style.padding = "10px";
    msg.style.borderRadius = "10px";
    msg.style.maxWidth = "80%";
    msg.style.wordWrap = "break-word";
    msg.style.whiteSpace = "pre-wrap";

    if(sender === "user") {
      msg.style.background = "#27ae60";
      msg.style.color = "#fff";
      msg.style.alignSelf = "flex-end";
      msg.textContent = content;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    } else {
      msg.style.background = "#ecf0f1";
      msg.style.color = "#2c3e50";
      msg.style.alignSelf = "flex-start";
      body.appendChild(msg);

      let i = 0;
      const interval = setInterval(() => {
        msg.textContent += content.charAt(i);
        i++;
        body.scrollTop = body.scrollHeight;
        if(i >= content.length) clearInterval(interval);
      }, 30);
    }
  }

  async function sendMessage() {
    const text = input.value.trim();
    if(!text) return;
    addMessage(text, "user");
    input.value = "";

    try {
      const res = await fetch("https://shelldon-vercel.vercel.app/api/shelldon?message=" + encodeURIComponent(text));
      const data = await res.json();
      addMessage(data.reply || "⚠️ Shelldon couldn’t get a response.", "shelldon");
    } catch(err) {
      console.error(err);
      addMessage("⚠️ Shelldon couldn’t get a response.", "shelldon");
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => { if(e.key === "Enter") sendMessage(); });

  // Initial greeting
  addMessage("Hi, I’m Shelldon! How can I help with your shopping today?", "shelldon");
})();
</script>
<!-- Shelldon Chat Widget End -->
