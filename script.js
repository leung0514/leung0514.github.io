const messages = [];
const url = "https://chatanywhere-js.onrender.com/api/ChatAnywhereStream";

const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
const getMessagesHtml = (messages) => {
  return messages
    .map((message, index) => {
      const icon =
        index % 2 === 0
          ? '<i class="bi bi-emoji-sunglasses-fill"></i>'
          : '<i class="bi bi-robot"></i>';
      const promptMsg = index % 2 === 0 ? "message-prompt" : "";
      message = escapeHtml(message);
      const wrappedMessage = index % 2 !== 0 ? wrapCodeTags(message) : message;
      return `<div class="message ${promptMsg}"><div class="message-top">${icon}<i class="bi bi-files"></i></div>${wrappedMessage}</div>`;
    })
    .join("");
};
const wrapCodeTags = (str) => {
  const codeBlockRegex = /```(.+)?\n([\s\S]*?)\n```/gm;
  const codeBlockTemplate =
    '<pre><div class="message-top"><span> $1</span><i class="bi bi-code-square"></i></div><code>$2</code></pre>';
  return str.replaceAll(codeBlockRegex, codeBlockTemplate);
};
const createMessage = (content, role) => ({ role, content });
const generateMessages = (messages) => {
  return messages.map((message, index) => {
    const role = index % 2 === 0 ? "user" : "assistant";
    return createMessage(message, role);
  });
};
const displayMessages = (messages) => {
  const messageHtml = getMessagesHtml(messages);
  $("#message-container").html(messageHtml);
  setupCopyEvents();
  hljs.highlightAll();
};
const setupCopyEvents = () => {
  $(".bi-files").click(function () {
    var idx = $(".bi-files").index(this);
    navigator.clipboard.writeText(messages[idx]);
  });
  $(".bi-code-square").click(function () {
    var code = $(this).parent().next("code").text();
    navigator.clipboard.writeText(code);
  });
};
const fetchResponse = async (msgs) => {
  let res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msgs),
  }).catch((error) => {
    $("#send-button")
      .prop("disabled", true)
      .html("Error, please refresh.")
      .attr("class", "btn btn-warning");
    return;
  });

  let reader = res.body.getReader();
  let result;
  let decoder = new TextDecoder("utf8");
  while (!result?.done) {
    result = await reader.read();
    let chunk = decoder.decode(result.value);
    const arr = chunk.split("\n");
    arr.forEach((data) => {
      if (data.length === 0) return;
      if (data.startsWith(":")) return;
      if (data === "data: [DONE]") {
        $("#send-button").prop("disabled", false).html("Send");
        return;
      }
      const jsonData = JSON.parse(data.substring(6));
      const delta = jsonData.choices[0].delta;
      if (delta.content != null) {
        messages[messages.length - 1] += delta.content;
      }
      displayMessages(messages);
    });
  }
};
const promptGPT = (messages) => {
  $("#message-input").val("");
  $("#send-button").prop("disabled", true).html("Please wait");
  const msgs = generateMessages(messages);
  fetchResponse(msgs);
};

$(document).ready(function () {
  displayMessages(messages);
  $("#send-button").click(function (event) {
    event.preventDefault();
    const message = $("#message-input").val();
    messages.push(message);
    messages.push("");
    displayMessages(messages);
    promptGPT(messages);
  });
});
