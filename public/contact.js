function mailMe() {
    let name = document.getElementById("input-name").value
    // let email = document.getElementById("input-email").value
    let phoneNumber= document.getElementById("input-number").value
    let mailSubject= document.getElementById("input-subject").value
    let mailMessage= document.getElementById("input-message").value

    let mail = document.createElement('a');
    mail.href = `mailto:adamrohmannn@gmail.com?subject=${mailSubject}&body=Hai Adam nama saya ${name}! ${mailMessage} silahkan hubungi saya di ${phoneNumber}`
    mail.click()
}