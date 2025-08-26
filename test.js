import mongoose from 'mongoose';
import dotenv from 'dotenv'
dotenv.config()
mongoose.connect(process.env.MONGO_URI)
const {Schema,model}=mongoose;
const blogSchema = new Schema({
    title: String,
  slug: String,
  published: Boolean,
  author: String,
  content: String,
  tags: [String],
  createdAt: Date,
  updatedAt: Date,
  comments: [{
    user: String,
    content: String,
    votes: Number
  }]
})
const Blog = model('Blog',blogSchema);
// two steps instatiate and save
// const article = new Blog({
//     title:'test post 1',
//     slug:'test post',
//     published:true,
//     content:'this post',
//     tags:['featured','announcement']
// })
// article.title="test post 101"
// await article.save()
// console.log(article);

// await article.save()

//using create single step
// const article = await Blog.create({
//   title: 'Awesome Post!',
//   slug: 'awesome-post',
//   published: true,
//   content: 'This is the best post ever',
//   tags: ['featured', 'announcement'],
// });
// console.log(article)

// update
// const article = await Blog.findById("68add5cd07c4db4a5b78f722").exec()
// console.log(article)

//delete
// const blog = await Blog.deleteOne({title:"test post 1"});
// console.log(blog) 
//{ acknowledged: true, deletedCount: 1 }

// const blogWhere = await Blog.where("slug").equals("test post")
// console.log(blogWhere)


// const firstArticle = await Blog.findOne({})
// console.log(firstArticle)
