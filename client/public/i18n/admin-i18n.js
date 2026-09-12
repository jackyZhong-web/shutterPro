(()=>{
  const STORAGE_KEY="admin_lang"
  const DEFAULT_LANG="en"
  const SUPPORTED=["en","zh-CN"]
  let currentLang=DEFAULT_LANG
  let dict={}
  const readLang=()=>{
    const raw=localStorage.getItem(STORAGE_KEY)||DEFAULT_LANG
    return SUPPORTED.includes(raw)?raw:DEFAULT_LANG
  }
  const loadDict=async(lang)=>{
    const url=`/i18n/${encodeURIComponent(lang)}.json?_ts=${Date.now()}`
    const res=await fetch(url,{cache:"no-store"})
    if(!res||!res.ok)return {}
    try{
      const json=await res.json()
      return json&&typeof json==="object"?json:{}
    }catch(e){
      return {}
    }
  }
  const t=(key,fallback="")=>{
    if(!key)return fallback
    const value=dict[key]
    if(typeof value==="string")return value
    return fallback||key
  }
  const apply=(root=document)=>{
    root.querySelectorAll("[data-i18n]").forEach(el=>{
      const key=el.getAttribute("data-i18n")||""
      const fallback=el.dataset.i18nFallback||el.textContent||""
      el.textContent=t(key,fallback)
    })
    root.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{
      const key=el.getAttribute("data-i18n-placeholder")||""
      const fallback=el.getAttribute("placeholder")||""
      el.setAttribute("placeholder",t(key,fallback))
    })
    root.querySelectorAll("[data-admin-lang-switch]").forEach(select=>{
      if(select.value!==currentLang)select.value=currentLang
    })
    document.title=t("admin.page.title","EVERMERE SHUTTERS")
  }
  const setLang=async(lang)=>{
    currentLang=SUPPORTED.includes(lang)?lang:DEFAULT_LANG
    localStorage.setItem(STORAGE_KEY,currentLang)
    dict=await loadDict(currentLang)
    apply(document)
    window.dispatchEvent(new CustomEvent("admin-lang-changed",{detail:{lang:currentLang}}))
  }
  const bindSwitch=()=>{
    document.querySelectorAll("[data-admin-lang-switch]").forEach(select=>{
      if(select.dataset.langBound==="1")return
      select.dataset.langBound="1"
      select.addEventListener("change",()=>setLang(select.value))
    })
  }
  const init=async()=>{
    currentLang=readLang()
    dict=await loadDict(currentLang)
    bindSwitch()
    apply(document)
  }
  window.adminI18n={init,setLang,getLang:()=>currentLang,t,apply}
  document.addEventListener("DOMContentLoaded",()=>{init()})
})()
