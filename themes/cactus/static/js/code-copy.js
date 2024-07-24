(() => {

  function createHeader(hlNode) {
    const copyBtn = document.createElement('button')
    copyBtn.className = 'code-copy-btn'
    copyBtn.type = 'button'
    copyBtn.innerText = 'copy'

    let resetTimer
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(hlNode.querySelectorAll("code")[1].innerText).then(() => {
        copyBtn.innerText = 'copied!'
      }).then(() => {
        clearTimeout(resetTimer)
        resetTimer = setTimeout(() => {
          copyBtn.innerText = 'copy'
        }, 1000)
      })
    })

    let header = document.createElement("div");
    header.classList.add("code-header");

    titleAttribute = hlNode.getAttribute("title");
    if (titleAttribute) {
        let title = document.createElement("div");
        title.classList.add("code-title");
        title.textContent = titleAttribute;
        header.appendChild(title);
    }
    header.appendChild(copyBtn);
    return header;
}

  document.querySelectorAll('div.highlight')
  .forEach((hlNode) => {
        let header = createHeader(hlNode);
        hlNode.firstElementChild.insertBefore(header, hlNode.firstElementChild.firstElementChild);
  })

  document.querySelectorAll('.highlight table > tbody > tr > td:first-child .code-copy-btn')
  .forEach((btn) => {
    btn.remove()
  })
})()
