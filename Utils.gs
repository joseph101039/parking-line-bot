// Utils.gs
function normalizePlate(text) {
  if (!text) return "";
  // 全形/半形 dash normalize to hyphen, spaces -> hyphen, uppercase letters
  let s = String(text).trim().toUpperCase();
  // replace various hyphen-like chars to standard hyphen
  s = s.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFF0D\-—–−~\s]+/g, "-");
  // remove duplicate hyphens
  s = s.replace(/-+/g, "-");
  // trim leading/trailing hyphen
  s = s.replace(/^-|-$|/g, function(m){ return m; });
  // ensure letters numeric pattern later validated
  return s;
}

function validatePlate(plate) {
  return /^[A-Z]{3}-\d{4}$/.test(plate);
}
