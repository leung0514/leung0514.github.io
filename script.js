const messages = [];
const url = "https://chatanywhere-js.onrender.com/api/ChatAnywhereStream";
const prePrompt = [];

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
    '<pre><div class="message-top"><span> $1</span><i class="bi bi-file-earmark-code"></i></div><code>$2</code></pre>';
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

const copyEffect = (el) => {
  const copyButton = $(el);
  copyButton.css("color", "#64dd17");
  setTimeout(function () {
    copyButton.css("color", "");
  }, 500);
};

const setupCopyEvents = () => {
  $(".bi-files").click(function () {
    var idx = $(".bi-files").index(this);
    navigator.clipboard.writeText(messages[idx]);
    copyEffect(this);
  });
  $(".bi-file-earmark-code").click(function () {
    var code = $(this).parent().next("code").text();
    navigator.clipboard.writeText(code);
    copyEffect(this);
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


const handleSendButtonClick = (event) => {
  event.preventDefault();
  const message = $("#message-input").val();
  messages.push(message, "");
  displayMessages(messages);
  promptGPT(messages);
  clearPrePrompt();
};

const getPrePrompt = (transToEn, transToCn, summ, optimize, grammar) => {
  const prePrompt = "Could you kindly assist me with ";
  if (optimize) return `${prePrompt}simplifying and optimizing the code below? Please use code formatting (\`\`\`language) and let me know if it already looks optimized.\n`;
  if (grammar) return `${prePrompt}checking the grammar below?\n`;
  if (transToEn && !transToCn && !summ) return `${prePrompt}translating below into English?\n`;
  if (!transToEn && !transToCn && summ) return `${prePrompt}summarizing below?\n`;
  if (transToEn && !transToCn && summ) return `${prePrompt}summarizing and translating below into English?\n`;
  if (!transToEn && transToCn && !summ) return `${prePrompt}translating below into Chinese?\n`;
  if (!transToEn && transToCn && summ) return `${prePrompt}summarizing and translating below into Chinese?\n`;
  return "";
};

const clearPrePrompt = () => {
  prePrompt.length = 0;
  $("#translate-en-button, #translate-cn-button, #summarize-button, #optimize-button, #grammar-button")
    .data("clicked", false)
    .addClass("btn-link")
    .removeClass("btn-success");
};

const toggleClicked = (button) => {
  const clicked = !button.data("clicked");
  button.data("clicked", clicked).toggleClass("btn-link", !clicked).toggleClass("btn-success", clicked);
};

const handleClick = (button1, button2, exclusiveButtons = []) => {
  button2?.data("clicked", false).addClass("btn-link").removeClass("btn-success");
  toggleClicked(button1);
  exclusiveButtons.forEach(btn => {
    if (btn !== button1.attr('id')) {
      $(`${btn}`).data("clicked", false).addClass("btn-link").removeClass("btn-success");
    }
  });
  handleHotkeyClick();
};

const handleHotkeyClick = () => {
  const [transToEn, transToCn, summ, optimize, grammar] = ["#translate-en-button", "#translate-cn-button", "#summarize-button", "#optimize-button", "#grammar-button"].map(id => $(id).data("clicked") || false);
  const pPrompt = getPrePrompt(transToEn, transToCn, summ, optimize, grammar);
  const messageInput = $("#message-input");
  const currentMessage = messageInput.val();
  if (!prePrompt[0] || prePrompt[0] === '') {
    prePrompt[1] = currentMessage;
  }
  prePrompt[0] = pPrompt;
  messageInput.val(`${prePrompt[0]}${prePrompt[1]}`).trigger("change").focus();
};

$(document).ready(() => {
  displayMessages(messages);
  $("#send-button").click(handleSendButtonClick);
  $("#translate-en-button").click(() => handleClick($("#translate-en-button"), $("#translate-cn-button"), ['#optimize-button', '#grammar-button']));
  $("#translate-cn-button").click(() => handleClick($("#translate-cn-button"), $("#translate-en-button"), ['#optimize-button', '#grammar-button']));
  $("#summarize-button").click(() => handleClick($("#summarize-button"), null, ['#optimize-button', '#grammar-button']));
  $("#optimize-button").click(() => handleClick($("#optimize-button"), $("#grammar-button"), ['#translate-en-button', '#translate-cn-button', '#summarize-button']));
  $("#grammar-button").click(() => handleClick($("#grammar-button"), $("#optimize-button"), ['#translate-en-button', '#translate-cn-button', '#summarize-button']));
  $("#message-input").focus().on('input change', function () {
    const { scrollHeight } = this;
    this.style.height = `${Math.min(scrollHeight, 500)}px`;
    this.style.overflowY = (scrollHeight > 500) ? 'scroll' : 'hidden';
  });
});