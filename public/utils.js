export function addBlurOrEnterListener(inputElement, callback) {
  inputElement.addEventListener("blur", callback);
  inputElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      callback();
    }
  });
}

function concatenateTemplateLiteralTag(raw, ...keys) {
  return keys.length === 0 ? raw[0] : String.raw({ raw }, ...keys);
}

export const html = concatenateTemplateLiteralTag;
