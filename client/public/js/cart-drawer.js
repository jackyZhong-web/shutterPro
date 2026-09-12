window.cartDrawerInit=()=>{
  const getDrawer=()=>{
    let root=document.querySelector(".cart-drawer")
    if(root)return root
    root=document.createElement("div")
    root.className="cart-drawer"
    root.innerHTML=`
      <div class="cart-drawer-backdrop" data-cart-close></div>
      <div class="cart-drawer-panel">
        <div class="cart-drawer-body">
          <iframe class="cart-drawer-frame" data-cart-frame></iframe>
        </div>
      </div>
    `
    document.body.appendChild(root)
    root.querySelectorAll("[data-cart-close]").forEach(btn=>{
      btn.addEventListener("click",()=>root.classList.remove("is-open"))
    })
    return root
  }

  const updateBadge=(count)=>{
    window.qsa(".cart-icon .badge").forEach(b=>{b.textContent=String(count)})
  }

  const loadCart=async()=>{
    const res=await window.apiFetch("/cart")
    if(!res||!res.ok)return
    const data=await res.json()
    const lines=data.lines||[]
    updateBadge(lines.length)
  }

  const openDrawer=async()=>{
    const root=getDrawer()
    root.classList.add("is-open")
    const frame=root.querySelector("[data-cart-frame]")
    if(frame){
      const src="/cart.html?embed=1"
      if(frame.dataset.src!==src){
        frame.dataset.src=src
        frame.src=src
      }else{
        frame.src=src
      }
    }
    await loadCart()
  }

  window.qsa(".cart-icon").forEach(icon=>{
    icon.addEventListener("click",e=>{
      e.preventDefault()
      openDrawer()
    })
  })
}
