window.userDashboardInit=()=>{
  const units=window.units||{}
  const getUnit=()=>units.getUnit?units.getUnit():"mm"
  const areaLabel=()=>units.areaLabel?units.areaLabel(getUnit()):"㎡"
  const formatArea=(sqm)=>units.formatAreaFromSqm?units.formatAreaFromSqm(sqm,getUnit()):(sqm||"0.00")
  const kpiOrders=document.querySelector("[data-kpi-orders]")
  const kpiOrdersNote=document.querySelector("[data-kpi-orders-note]")
  const kpiSubmitted=document.querySelector("[data-kpi-submitted]")
  const kpiSubmittedNote=document.querySelector("[data-kpi-submitted-note]")
  const kpiAvg=document.querySelector("[data-kpi-avg]")
  const kpiAvgNote=document.querySelector("[data-kpi-avg-note]")
  const kpiDrafts=document.querySelector("[data-kpi-drafts]")
  const kpiDraftsNote=document.querySelector("[data-kpi-drafts-note]")
  const chartWrap=document.querySelector("[data-activity-chart]")
  const chartInsight=document.querySelector("[data-chart-insight]")
  const chartTooltip=document.querySelector("[data-chart-tooltip]")
  const calendarGrid=document.querySelector("[data-calendar]")
  const calendarMonthLabel=document.querySelector("[data-cal-month]")
  const calendarPrev=document.querySelector("[data-cal-prev]")
  const calendarNext=document.querySelector("[data-cal-next]")
  const selectedDateLabel=document.querySelector("[data-selected-date]")
  const selectedOrdersLabel=document.querySelector("[data-selected-orders]")
  const selectedAreaLabel=document.querySelector("[data-selected-area]")
  const selectedList=document.querySelector("[data-selected-list]")
  const recentList=document.querySelector("[data-recent-list]")
  const rangeButtons=Array.from(document.querySelectorAll("[data-range]"))
  const filterButtons=Array.from(document.querySelectorAll("[data-filter]"))
  let rangeDays=30
  let currentFilter="all"
  let orders=[]
  let filteredOrders=[]
  let byDate=new Map()
  let selectedDateKey=""
  let calendarMonth=new Date()

  const toDate=(value)=>{
    if(!value)return null
    const raw=String(value)
    const hasZone=/Z$|[+-]\d{2}:?\d{2}$/.test(raw)
    const date=new Date(hasZone?raw:raw)
    if(Number.isNaN(date.getTime()))return null
    return date
  }
  const toKey=(date)=>{
    const pad=n=>String(n).padStart(2,"0")
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
  }
  const formatKey=(key)=>{
    if(!key)return "-"
    const [y,m,d]=key.split("-")
    return `${y}-${m}-${d}`
  }
  const getRangeKeys=(days,baseDate)=>{
    const today=baseDate?new Date(baseDate):new Date()
    const list=[]
    for(let i=days-1;i>=0;i-=1){
      const d=new Date(today)
      d.setDate(today.getDate()-i)
      list.push(toKey(d))
    }
    return list
  }
  const getMonthKeys=()=>{
    const base=new Date(calendarMonth)
    const year=base.getFullYear()
    const month=base.getMonth()
    const daysInMonth=new Date(year,month+1,0).getDate()
    const list=[]
    for(let day=1;day<=daysInMonth;day+=1){
      list.push(toKey(new Date(year,month,day)))
    }
    return list
  }
  const getChartKeys=()=>rangeDays===7?getRangeKeys(7,selectedDateKey?new Date(selectedDateKey):null):getMonthKeys()
  const buildStats=()=>{
    byDate=new Map()
    filteredOrders.forEach(order=>{
      const date=toDate(order.date)
      if(!date)return
      const key=toKey(date)
      const current=byDate.get(key)||{count:0,sqm:0,orders:[]}
      current.count+=1
      current.sqm+=parseFloat(order.sqmTotal||"0")||0
      current.orders.push(order)
      byDate.set(key,current)
    })
  }
  const renderKpis=()=>{
    const now=new Date()
    const start=new Date(now)
    start.setDate(now.getDate()-29)
    const recentOrders=filteredOrders.filter(order=>{
      const date=toDate(order.date)
      return date&&date>=start&&date<=now
    })
    const recentCount=recentOrders.length
    const submitted=filteredOrders.filter(o=>o.status==="sent").length
    const drafts=filteredOrders.filter(o=>o.status!=="sent").length
    const avg=recentOrders.length?recentOrders.reduce((sum,o)=>sum+(parseFloat(o.sqmTotal||"0")||0),0)/recentOrders.length:0
    if(kpiOrders)kpiOrders.textContent=String(recentCount)
    if(kpiOrdersNote)kpiOrdersNote.textContent=rangeDays===7?"7 day view":"Month to date"
    if(kpiSubmitted)kpiSubmitted.textContent=String(submitted)
    if(kpiSubmittedNote)kpiSubmittedNote.textContent=`Total records`
    if(kpiAvg)kpiAvg.textContent=`${formatArea(avg)}${areaLabel()}`
    if(kpiAvgNote)kpiAvgNote.textContent="Per order"
    if(kpiDrafts)kpiDrafts.textContent=String(drafts)
    if(kpiDraftsNote)kpiDraftsNote.textContent="Open drafts"
  }
  const renderChart=()=>{
    if(!chartWrap)return
    const keys=getChartKeys()
    chartWrap.style.gridTemplateColumns=`repeat(${keys.length}, minmax(0, 1fr))`
    chartWrap.innerHTML=""
    const maxCount=Math.max(...keys.map(k=>byDate.get(k)?.count||0),1)
    const maxArea=Math.max(...keys.map(k=>byDate.get(k)?.sqm||0),1)
    keys.forEach(key=>{
      const data=byDate.get(key)||{count:0,sqm:0}
      const bar=document.createElement("div")
      bar.className="chart-bar"
      if(key===selectedDateKey)bar.classList.add("active")
      bar.style.height=`${8+Math.round((data.count/maxCount)*60)}px`
      const area=document.createElement("div")
      area.className="bar-area"
      area.style.height=`${Math.round((data.sqm/maxArea)*100)}%`
      bar.appendChild(area)
      bar.addEventListener("mousemove",(e)=>{
        if(!chartTooltip)return
        const rect=chartWrap.getBoundingClientRect()
        chartTooltip.style.opacity="1"
        chartTooltip.style.left=`${e.clientX-rect.left+12}px`
        chartTooltip.style.top=`${e.clientY-rect.top-24}px`
        chartTooltip.textContent=`${formatKey(key)} · ${data.count} orders · ${formatArea(data.sqm)}${areaLabel()}`
      })
      bar.addEventListener("mouseleave",()=>{
        if(chartTooltip)chartTooltip.style.opacity="0"
      })
      bar.addEventListener("click",()=>{
        selectedDateKey=key
        renderChart()
        renderCalendar()
        renderSelected()
      })
      chartWrap.appendChild(bar)
    })
    const peak=keys.reduce((acc,key)=>{
      const data=byDate.get(key)||{count:0,sqm:0}
      if(data.count>acc.count)return {key,count:data.count,sqm:data.sqm}
      return acc
    },{key:"",count:0,sqm:0})
    if(chartInsight){
      chartInsight.textContent=peak.count?`Peak: ${formatKey(peak.key)} · ${peak.count} orders · ${formatArea(peak.sqm)}${areaLabel()}`:"No activity yet"
    }
  }
  const renderCalendar=()=>{
    if(!calendarGrid)return
    const date=new Date(calendarMonth)
    date.setDate(1)
    const startDay=date.getDay()
    const monthLabel=date.toLocaleString("en",{month:"long",year:"numeric"})
    if(calendarMonthLabel)calendarMonthLabel.textContent=monthLabel
    const daysInMonth=new Date(date.getFullYear(),date.getMonth()+1,0).getDate()
    const cells=[]
    for(let i=0;i<startDay;i+=1)cells.push(null)
    for(let day=1;day<=daysInMonth;day+=1){
      const d=new Date(date.getFullYear(),date.getMonth(),day)
      cells.push(d)
    }
    calendarGrid.innerHTML=""
    cells.forEach(cell=>{
      const div=document.createElement("div")
      div.className="calendar-cell"
      if(!cell){
        div.style.visibility="hidden"
        calendarGrid.appendChild(div)
        return
      }
      const key=toKey(cell)
      const data=byDate.get(key)
      if(data&&data.count)div.classList.add("has-data")
      if(key===selectedDateKey)div.classList.add("active")
      div.innerHTML=`
        <div class="day">${cell.getDate()}</div>
        <div class="mini">${data?`${data.count} orders`: "—"}</div>
        <div class="mini">${data?`${formatArea(data.sqm)}${areaLabel()}`: ""}</div>
      `
      div.addEventListener("click",()=>{
        selectedDateKey=key
        renderCalendar()
        renderChart()
        renderSelected()
      })
      calendarGrid.appendChild(div)
    })
  }
  const renderSelected=()=>{
    const data=byDate.get(selectedDateKey)||{count:0,sqm:0,orders:[]}
    if(selectedDateLabel)selectedDateLabel.textContent=selectedDateKey?formatKey(selectedDateKey):"No day selected"
    if(selectedOrdersLabel)selectedOrdersLabel.textContent=String(data.count||0)
    if(selectedAreaLabel)selectedAreaLabel.textContent=`${formatArea(data.sqm||0)}${areaLabel()}`
    if(selectedList){
      selectedList.innerHTML=""
      if(!data.orders||data.orders.length===0){
        const empty=document.createElement("div")
        empty.className="detail-item"
        empty.innerHTML=`<span>No orders</span><strong>—</strong>`
        selectedList.appendChild(empty)
      }else{
        data.orders.slice(0,4).forEach(order=>{
          const item=document.createElement("div")
          item.className="detail-item"
          item.innerHTML=`<span>${order.orderNo||"Order"}</span><strong>${formatArea(order.sqmTotal||0)}${areaLabel()}</strong>`
          selectedList.appendChild(item)
        })
      }
    }
  }
  const renderRecent=()=>{
    if(!recentList)return
    recentList.innerHTML=""
    const sorted=filteredOrders.slice().sort((a,b)=>{
      const aTime=toDate(a.date)?.getTime()||0
      const bTime=toDate(b.date)?.getTime()||0
      return bTime-aTime
    })
    sorted.slice(0,6).forEach(order=>{
      const item=document.createElement("div")
      item.className="recent-item"
      item.innerHTML=`
        <strong>${order.orderNo||"—"}</strong>
        <span>${order.customerName||"—"}</span>
        <span>${formatKey(toKey(toDate(order.date)||new Date()))}</span>
        <span class="pill">${order.status||"-"}</span>
        <span>${formatArea(order.sqmTotal||0)}${areaLabel()}</span>
      `
      recentList.appendChild(item)
    })
  }
  const load=async()=>{
    const res=await window.apiFetch("/orders")
    if(!res||!res.ok)return
    orders=await res.json()
    applyFilter()
    buildStats()
    renderKpis()
    selectedDateKey=getChartKeys().slice(-1)[0]
    calendarMonth=new Date()
    renderChart()
    renderCalendar()
    renderSelected()
    renderRecent()
  }
  const applyFilter=()=>{
    if(currentFilter==="submitted"){
      filteredOrders=orders.filter(o=>o.status==="sent")
    }else if(currentFilter==="draft"){
      filteredOrders=orders.filter(o=>o.status!=="sent")
    }else{
      filteredOrders=orders.slice()
    }
    buildStats()
    renderKpis()
    renderChart()
    renderCalendar()
    renderSelected()
    renderRecent()
  }

  if(calendarPrev)calendarPrev.addEventListener("click",()=>{
    calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1)
    const monthKeys=getMonthKeys()
    if(rangeDays===30)selectedDateKey=monthKeys[0]||""
    if(rangeDays===7&&!selectedDateKey)selectedDateKey=monthKeys[0]||""
    renderCalendar()
    renderChart()
    renderSelected()
  })
  if(calendarNext)calendarNext.addEventListener("click",()=>{
    calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1)
    const monthKeys=getMonthKeys()
    if(rangeDays===30)selectedDateKey=monthKeys[0]||""
    if(rangeDays===7&&!selectedDateKey)selectedDateKey=monthKeys[0]||""
    renderCalendar()
    renderChart()
    renderSelected()
  })
  rangeButtons.forEach(btn=>{
    btn.addEventListener("click",()=>{
      rangeButtons.forEach(b=>b.classList.remove("active"))
      btn.classList.add("active")
      rangeDays=parseInt(btn.dataset.range||"30",10)||30
      if(rangeDays===7&&!selectedDateKey){
        const monthKeys=getMonthKeys()
        selectedDateKey=monthKeys[0]||""
      }
      renderKpis()
      renderChart()
      renderSelected()
    })
  })
  filterButtons.forEach(btn=>{
    btn.addEventListener("click",()=>{
      filterButtons.forEach(b=>b.classList.remove("active"))
      btn.classList.add("active")
      currentFilter=btn.dataset.filter||"all"
      applyFilter()
    })
  })
  document.addEventListener("unit-change",()=>{
    renderKpis()
    renderChart()
    renderCalendar()
    renderSelected()
    renderRecent()
  })
  load()
}
