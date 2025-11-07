const messagesEl = document.getElementById('messages');
const input = document.getElementById('input');
const form = document.getElementById('inputForm');
const clearBtn = document.getElementById('clearBtn');
const pasteKeyBtn = document.getElementById('pasteKeyBtn');

let convo = [];

function render(){
  messagesEl.innerHTML = '';
  for(const m of convo){
    const li = document.createElement('li');
    li.className = 'message ' + (m.role === 'user' ? 'user' : 'ai');
    li.textContent = m.content;
    messagesEl.appendChild(li);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendToServer(messages){
  try{
    const resp = await fetch('/api/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages})
    });
    if(!resp.ok){
      const text = await resp.text();
      throw new Error(text || resp.statusText);
    }
    const data = await resp.json();
    const assistant = data.choices?.[0]?.message?.content ?? data.result ?? JSON.stringify(data);
    return assistant;
  }catch(err){
    return 'Error: ' + err.message;
  }
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const text = input.value.trim();
  if(!text) return;
  convo.push({role:'user',content:text});
  render();
  input.value = '';
  convo.push({role:'assistant',content:'…'});
  render();
  const assistantText = await sendToServer(convo);
  convo[convo.length-1] = {role:'assistant',content:assistantText};
  render();
});

clearBtn.addEventListener('click', ()=>{ convo = []; render(); });

pasteKeyBtn.addEventListener('click', async ()=>{
  const key = prompt('Paste your OpenAI API key here (this stores it only in your browser session; not recommended for public sites).');
  if(!key) return;
  window.__OPENAI_TEST_KEY = key;
  alert('Key stored in this browser session as window.__OPENAI_TEST_KEY. For production, deploy the serverless function and set OPENAI_API_KEY there.');
});

const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) =>{
  if(typeof input === 'string' && input === '/api/chat' && window.__OPENAI_TEST_KEY){
    const body = JSON.parse(init.body);
    const openaiResp = await originalFetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers: {'Content-Type':'application/json', 'Authorization':'Bearer ' + window.__OPENAI_TEST_KEY}, body: JSON.stringify({model:'gpt-3.5-turbo',messages: body.messages}) });
    return openaiResp;
  }
  return originalFetch(input, init);
};

render();