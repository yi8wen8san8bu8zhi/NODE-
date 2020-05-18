const express = require('express')
const bodyParser = require('body-parser')
const multiparty = require('multiparty')
const fse = require('fs-extra')
const path = require('path')
const fs = require('fs')

const app = express()

// 静态文件目录
app.use(express.static(__dirname + '/public'))

// 解析上传
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(bodyParser.json())

// 文件保存
const UPLOAD_DIR = path.resolve(__dirname, 'public/upload')
// 上传文件
app.post('/upload', function (req, res) {
    // 定义上传文件存放目录
    const form = new multiparty.Form({
        uploadDir: 'temp'
    })
    form.parse(req)
    // 监听文件上传
    form.on('file', async (name, chunk) => {
        // 存放切片的目录
        let chunkDir = `${UPLOAD_DIR}/${chunk.originalFilename.split('.')[0]}`
        if (!fse.existsSync(chunkDir)) {
            await fse.mkdirs(chunkDir)
        }
        // 文件命名方式:原文件名+index+ext
        var dPath = path.join(chunkDir, chunk.originalFilename.split('.')[1])
        // 将分片从临时目录移到存放目录
        await fse.move(chunk.path, dPath, {
            overwrite: true
        })
    })
    res.end("文件上传成功")
})

// 合并文件
app.post('/merge', async function (req, res) {
    // 上传文件名字和类型
    let name = req.body.name;
    // 上传文件名字
    let fname = name.split('.')[0]
    // 切片地址
    let chunkDir = path.join(UPLOAD_DIR, fname)
    // 读取切片的文件
    let chunks = await fse.readdir(chunkDir)
    // 分片按索引进行排序
    chunks.sort((a, b) => a - b).map(chunkPath => {
        // 文件同步写入
        fs.appendFileSync(
            path.join(UPLOAD_DIR, name),
            fs.readFileSync(`${chunkDir}/${chunkPath}`)
        )
    })
    // 删除分片目录
    fse.remove(chunkDir);
    // 返回地址合并成功文件的url
    res.send({
        meg: "ok",
        url: `http://localhost/upload/${name}`
    })
})
app.listen(80, () => {
    console.log('启动成功')
})