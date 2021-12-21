const p = (n, H) => 1 - Math.pow(Math.E, (-Math.pow(n, 2) / (2 * H)))
const n = (p, H) => Math.sqrt(2 * H * Math.log(1 / (1 - p)))
const H = (n, p) => Math.pow(n, 2) / (2 * Math.log(1 / (1 - p)))
