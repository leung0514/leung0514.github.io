let isAllowGetResponse = false;
const messages = [];
const baseUrl = "https://chatanywhere-js.onrender.com/api/ChatAnywhere";
//const baseUrl = "http://127.0.0.1:3000/api/ChatAnywhere";
const prePrompt = [];
const defaultTheme = "dark";
const md = markdownit({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre><div class="message-top"><span>${lang}</span><i class="bi bi-file-earmark-code"></i></div><code class="hljs">` +
               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
               '</code></pre>';
      } catch (__) {}
    }
    return '<pre><div class="message-top"><span>code</span><i class="bi bi-file-earmark-code"></i></div><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});

const getMessagesHtml = (messages) =>
  messages
    .map((message, index) => {
      const icon = index % 2 === 0 ? "bi-emoji-sunglasses" : "bi-robot";
      const promptMsg = index % 2 === 0 ? "message-prompt" : "";
      //message = escapeHtml(message);      
      message = index % 2 !== 0 ? md.render(message) : message;      
      return `<div class="message ${promptMsg}"><div class="message-top"><i class="bi ${icon}"></i><i class="bi bi-files"></i></div><div class="message-markdown">${message}</div></div>`;
    })
    .join("");

const createMessage = (content, role) => ({ role, content });

const generateMessages = (messages) =>
  messages.map((message, index) =>
    createMessage(message, index % 2 === 0 ? "user" : "assistant")
  );

const displayMessages = (messages) => {
  const messageHtml = getMessagesHtml(messages);
  $("#message-container").html(messageHtml);
  setupCopyEvents();
};

const copyEffect = (el) => {
  $(el).css("color", "#64dd17");
  setTimeout(() => $(el).css("color", ""), 500);
};

const setupEraseEvent = () => {
  $(".bi-eraser").click(() => {
    messages.length -= messages.length % 2 === 0 ? 2 : 1;
    displayMessages(messages);
  });
};

const setupCopyEvents = () => {
  $(".bi-files").click(function () {
    navigator.clipboard.writeText(messages[$(".bi-files").index(this)]);
    copyEffect(this);
  });
  $(".bi-file-earmark-code").click(function () {
    navigator.clipboard.writeText($(this).parent().next("code").text());
    copyEffect(this);
  });
};

const fetchResponse = async (msgs) => {
  const urlParams = new URLSearchParams(window.location.search);
  const modelName = urlParams.get('model');
  const url = modelName ? `${baseUrl}/${modelName}` : baseUrl;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msgs),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const arr = buffer.split("\n");
      buffer = arr.pop();

      arr.forEach((data) => {
        if (!isAllowGetResponse || !data || data.startsWith(":")) return;

        try {
          const jsonData = JSON.parse(data);
          const delta = jsonData.choices[0].delta;
          if (delta.content) messages[messages.length - 1] += delta.content;
          if (jsonData.choices[0].finish_reason === "stop") {
            $("#send-button").html("Send").attr("class", "btn btn-sm btn-primary");
            displayMessages(messages);
            return;
          }
        } catch (e) {
          console.error("Error parsing JSON:", e);
        }
      });

      if (arr.length > 0) displayMessages(messages);
    }

    if (buffer) {
      try {
        const jsonData = JSON.parse(buffer);
        const delta = jsonData.choices[0].delta;
        if (delta.content) messages[messages.length - 1] += delta.content;
        displayMessages(messages);
      } catch (e) {
        console.error("Error parsing final JSON:", e);
      }
    }
  } catch {
    $("#send-button").html("Send").attr("class", "btn btn-sm btn-primary");
    alert("Failed to fetch");
  }
};

const promptGPT = (messages) => {
  $("#message-input").val("");
  $("#send-button").html("Abort").attr("class", "btn btn-sm btn-warning");
  isAllowGetResponse = true;
  fetchResponse(generateMessages(messages));
};

const handleSendButtonClick = (event) => {
  event.preventDefault();
  const action = $(event.target).html();
  if (action === "Send") {
    messages.push($("#message-input").val(), "");
    displayMessages(messages);
    promptGPT(messages);
    clearPrePrompt();
  } else if (action === "Abort") {
    isAllowGetResponse = false;
    $("#send-button").html("Send").attr("class", "btn btn-sm btn-primary");
  }
};

const getPrePrompt = (
  existingPrompt,
  transToEn,
  transToCn,
  summ,
  optimize,
  grammar
) => {
  const start = "Could you kindly assist me with ";
  const end = `\n\`\`\`\n${existingPrompt}\n\`\`\``;
  if (optimize && summ) return `${start}simplifying and optimizing the code as much as possible? Please use code formatting (\`\`\`language\`\`\`), and provide a summary of the code at the end.${end}`;
  if (optimize) return `${start}simplifying and optimizing the code as much as possible? Please use code formatting (\`\`\`language\`\`\`).${end}`;
  if (grammar) return `${start}checking the grammar?${end}`;
  if (transToEn && !transToCn && !summ) return `${start}translating into English?${end}`;
  if (!transToEn && !transToCn && summ) return `${start}summarizing?${end}`;
  if (transToEn && !transToCn && summ) return `${start}summarizing, and translating into English?${end}`;
  if (!transToEn && transToCn && !summ) return `${start}translating into Chinese?${end}`;
  if (!transToEn && transToCn && summ) return `${start}summarizing, and translating into Chinese?${end}`;
  return "";
};

const clearPrePrompt = () => {
  prePrompt.length = 0;
  $(
    "#translate-en-button, #translate-cn-button, #summarize-button, #optimize-button, #grammar-button"
  )
    .data("clicked", false)
    .addClass("btn-link")
    .removeClass("btn-success");
};

const toggleClicked = (button) => {
  const clicked = !button.data("clicked");
  button
    .data("clicked", clicked)
    .toggleClass("btn-link", !clicked)
    .toggleClass("btn-success", clicked);
};

const handleClick = (button1, button2, exclusiveButtons = []) => {
  button2?.data("clicked", false).addClass("btn-link").removeClass("btn-success");
  toggleClicked(button1);
  exclusiveButtons.forEach((btn) => {
    if (btn !== button1.attr("id")) {
      $(btn).data("clicked", false).addClass("btn-link").removeClass("btn-success");
    }
  });
  handleHotkeyClick();
};

const handleHotkeyClick = () => {
  const buttonIds = [
    "#translate-en-button",
    "#translate-cn-button",
    "#summarize-button",
    "#optimize-button",
    "#grammar-button",
  ];
  const [tEn, tCn, sum, opt, gram] = buttonIds.map((id) => $(id).data("clicked") || false);
  const msgInput = $("#message-input");
  if (!prePrompt[0] || prePrompt[0] === "") prePrompt[1] = msgInput.val();
  const newVal = getPrePrompt(prePrompt[1], tEn, tCn, sum, opt, gram);
  prePrompt[0] = newVal;
  msgInput.val(newVal).trigger("change");
  msgInput[0].setSelectionRange(newVal.length - 4, newVal.length - 4);
  msgInput.focus();
};

const toggleTheme = () => {
  const currentTheme = $("html").attr("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  $("html").attr("data-theme", newTheme);
  $("#theme-switch").toggleClass("bi-sun bi-moon");
  $("#code-light").prop("disabled", newTheme === "dark");
  $("#code-dark").prop("disabled", newTheme === "light");
  sessionStorage.setItem("theme", newTheme);
};

const loadTheme = () => {
  const theme = sessionStorage.getItem("theme") || defaultTheme;
  $("#theme-switch").toggleClass("bi-moon", theme === "light").toggleClass("bi-sun", theme === "dark");
  $("html").attr("data-theme", theme);
  $("#code-light").prop("disabled", theme === "dark");
  $("#code-dark").prop("disabled", theme === "light");
};

$(document).ready(() => {
  loadTheme();
  displayMessages(messages);
  $("#theme-switch").click(toggleTheme);
  $("#send-button").click(handleSendButtonClick);
  $("#translate-en-button").click(() =>
    handleClick($("#translate-en-button"), $("#translate-cn-button"), [
      "#optimize-button",
      "#grammar-button",
    ])
  );
  $("#translate-cn-button").click(() =>
    handleClick($("#translate-cn-button"), $("#translate-en-button"), [
      "#optimize-button",
      "#grammar-button",
    ])
  );
  $("#summarize-button").click(() =>
    handleClick($("#summarize-button"), null, ["#grammar-button"])
  );
  $("#optimize-button").click(() =>
    handleClick($("#optimize-button"), $("#grammar-button"), [
      "#translate-en-button",
      "#translate-cn-button",
    ])
  );
  $("#grammar-button").click(() =>
    handleClick($("#grammar-button"), $("#optimize-button"), [
      "#translate-en-button",
      "#translate-cn-button",
      "#summarize-button",
    ])
  );
  $("#message-input")
    .focus()
    .on("input change", function () {
      this.style.height = `${Math.min(this.scrollHeight, 500)}px`;
      this.style.overflowY = this.scrollHeight > 500 ? "scroll" : "hidden";
    });
  setupEraseEvent();
});