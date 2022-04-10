const multer = require('multer')

const imgInfo = multer.diskStorage({
    destination: (req, file, callBack) => {
        callBack(null, "images")
    },
    filename: (req, file, callBack) => {
        callBack(null, Date.now() +"-"+ file.originalname)
    }
})
const upload = multer({storage: imgInfo})

module.exports = upload