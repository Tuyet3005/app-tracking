export function addBlurOrEnterListener(inputElement, callback) {
  inputElement.addEventListener("blur", callback);
  inputElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      callback();
    }
  });
}