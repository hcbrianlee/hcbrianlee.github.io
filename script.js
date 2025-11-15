// Updated script.js: custom model dropdown with per-option hover tooltip, and always-show explanation.

const messagesEl = document.getElementById('messages');
const input = document.getElementById('input');
const form = document.getElementById('inputForm');
const clearBtn = document.getElementById('clearBtn');
const pasteKeyBtn = document.getElementById('pasteKeyBtn');

const modelDropdown = document.getElementById('modelDropdown');
const modelToggle = document.getElementById('modelToggle');
const modelList = document.getElementById('modelList');
const modelLabel = document.getElementById('modelLabel');

let selectedModel = 'gpt-3.5-turbo';
let convo = [];

// CO2 estimates per request (grams of CO2 equivalent) — example placeholders; adjust as needed.
const modelCO2 = {
  'gpt-4': 10.0,
  'gpt-3.5-turbo': 2.5,
  'gpt-3.5-turbo-0613': 2.3,
  'text-davinci-003': 6.0
};

function render(){
  messagesEl.innerHTML = '';
  for(const m of convo){
    const li = document.createElement('li');
    li.className = 'message ' + (m.role === 'user' ? 'user' : 'ai');

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.textContent = m.content;
    li.appendChild(contentDiv);

    if(m.explanation){
      const exp = document.createElement('div');
      exp.className = 'explanation';
      exp.textContent = m.explanation.startsWith('Explanation:') ? m.explanation : ('Explanation: ' + m.explanation);
      li.appendChild(exp);
    }

    messagesEl.appendChild(li);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Send messages to server and request the model selected
async function sendToServer(messages, model){
  try{
    const resp = await fetch('/api/chat',{ 
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages, model})
    });
    if(!resp.ok){
      const text = await resp.text();
      throw new Error(text || resp.statusText);
    }
    const data = await resp.json();

    // Parse assistant text + explanation if present
    let assistantText = '';
    let explanation = '';

    if(data.answer && data.explanation){
      assistantText = data.answer;
      explanation = data.explanation;
    } else {
      const content = data.choices?.[0]?.message?.content ?? data.result ?? JSON.stringify(data);
      const splitIdx = content.lastIndexOf('\nExplanation:');
      if(splitIdx !== -1){
        assistantText = content.slice(0, splitIdx).trim();
        explanation = content.slice(splitIdx + 13).trim();
      } else {
        const marker = 'Explanation:';
        const markerIdx = content.indexOf(marker);
        if(markerIdx !== -1){
          assistantText = content.slice(0, markerIdx).trim();
          explanation = content.slice(markerIdx + marker.length).trim();
        } else {
          assistantText = content;
          explanation = '';
        }
      }
    }

    return {assistantText, explanation};
  }catch(err){
    return {assistantText: 'Error: ' + err.message, explanation: ''};
  }
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const text = input.value.trim();
  if(!text) return;
  convo.push({role:'user',content:text});
  render();
  input.value = '';

  // placeholder assistant
  convo.push({role:'assistant',content:'…', explanation:''});
  render();

  const {assistantText, explanation} = await sendToServer(convo, selectedModel);

  convo[convo.length-1] = {role:'assistant', content: assistantText, explanation};
  render();
});

clearBtn.addEventListener('click', ()=>{ convo = []; render(); });

pasteKeyBtn.addEventListener('click', async ()=>{
  const key = prompt('Paste your OpenAI API key here (this stores it only in your browser session; not recommended for public sites).');
  if(!key) return;
  window.__OPENAI_TEST_KEY = key;
  alert('Key stored in this browser session as window.__OPENAI_TEST_KEY. For production, deploy the serverless function and set OPENAI_API_KEY there.');
});

// Model dropdown behaviour (custom list so we can attach per-option hover info).
modelToggle.addEventListener('click', (ev)=>{
  const expanded = modelList.getAttribute('aria-hidden') === 'false';
  modelList.setAttribute('aria-hidden', String(expanded));
  modelToggle.setAttribute('aria-expanded', String(!expanded));
  if(!expanded){
    modelList.style.display = 'block';
  } else {
    modelList.style.display = 'none';
  }
});

// Close dropdown when clicking outside
document.addEventListener('click', (ev)=>{
  if(!modelDropdown.contains(ev.target)){
    modelList.setAttribute('aria-hidden', 'true');
    modelList.style.display = 'none';
    modelToggle.setAttribute('aria-expanded', 'false');
  }
});

// click on option to select
modelList.addEventListener('click', (ev)=>{
  const li = ev.target.closest('li[role="option"]');
  if(!li) return;
  const value = li.dataset.value;
  if(value){
    selectedModel = value;
    modelLabel.textContent = value;
    // mark selected attr for accessibility
    for(const opt of modelList.querySelectorAll('li')) opt.removeAttribute('aria-selected');
    li.setAttribute('aria-selected', 'true');
  }
  modelList.setAttribute('aria-hidden', 'true');
  modelList.style.display = 'none';
  modelToggle.setAttribute('aria-expanded', 'false');
});

// Tooltip element for CO2 info
const tooltip = document.createElement('div');
tooltip.className = 'co2-tooltip';
document.body.appendChild(tooltip);

// show tooltip when hovering info buttons
let tooltipTimeout = null;
modelList.addEventListener('mouseover', (ev)=>{
  const infoBtn = ev.target.closest('.model-info');
  if(!infoBtn) return;
  const model = infoBtn.dataset.model;
  clearTimeout(tooltipTimeout);
  tooltipTimeout = setTimeout(()=> {
    const co2 = modelCO2[model] ?? 0;
    const heaviest = Math.max(...Object.values(modelCO2));
    const savings = Math.max(0, heaviest - co2).toFixed(2);
    const smartphoneCharges = (co2 / 5).toFixed(2); // illustrative conversion
    tooltip.textContent = `${model}: ~${co2} g CO₂ per request. Choosing a lighter model can save ~${savings} g CO₂ per request (≈ ${smartphoneCharges} smartphone charges).`;
    tooltip.style.display = 'block';
    // position near the info button
    const r = infoBtn.getBoundingClientRect();
    tooltip.style.left = (r.right + 10) + 'px';
    tooltip.style.top = (r.top) + 'px';
  }, 80);
});

modelList.addEventListener('mouseout', (ev)=>{
  const infoBtn = ev.target.closest('.model-info');
  if(!infoBtn) return;
  clearTimeout(tooltipTimeout);
  tooltip.style.display = 'none';
});

// Quick-direct testing hook: if the browser has __OPENAI_TEST_KEY and fetch is for /api/chat,
// it will call OpenAI directly using that key (unsafe; for local testing only).
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) =>{
  if(typeof input === 'string' && input === '/api/chat' && window.__OPENAI_TEST_KEY){
    const body = JSON.parse(init.body);
    const openaiResp = await originalFetch('https://api.openai.com/v1/chat/completions',{ 
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer ' + window.__OPENAI_TEST_KEY
      },
      body: JSON.stringify({
        model: body.model || selectedModel,
        messages: body.messages.map(m => ({role: m.role, content: m.content})),
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    return openaiResp;
  }
  return originalFetch(input, init);
};

render();
