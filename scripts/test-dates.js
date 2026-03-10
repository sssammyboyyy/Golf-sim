const dateStr = '2026-02-28T14:00:00'
const d = new Date(dateStr)
console.log("Input:", dateStr)
console.log("getTime():", d.getTime())
console.log("toISOString():", d.toISOString())
console.log("getHours():", d.getHours())

const d2 = new Date('2026-02-28 16:00:00+02') // Simulate what comes from DB
console.log("\nDB Input:", '2026-02-28 16:00:00+02')
console.log("DB getTime():", d2.getTime())
console.log("DB toISOString():", d2.toISOString())
