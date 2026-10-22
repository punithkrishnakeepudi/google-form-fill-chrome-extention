// Run: node test.js
const assert = require('node:assert');
const { findKey, same } = require('./content.js');

const p = { name: 'A', phone: '1', email: 'a@b.c', college: 'X', class: 'BSc', 'favourite colour': 'red' };
assert.equal(findKey('Full Name *', p), 'name');
assert.equal(findKey('College Name', p), 'college');
assert.equal(findKey('Email Address', p), 'email');
assert.equal(findKey('Mobile Number', p), 'phone');
assert.equal(findKey('Year of study', p), 'class');
assert.equal(findKey('Favourite Colour?', p), 'favourite colour');
assert.equal(findKey('Hobbies', p), null);

// Someone else's details must be left alone, unless saved under their own title.
for (const t of ["Father's Name", 'Parent phone number', 'Emergency contact', 'Alternate email', 'Team member name'])
  assert.equal(findKey(t, p), null, t);
assert.equal(findKey("Father's Name", { ...p, "father s name": 'B' }), 'father s name');

// A learned answer must survive the same question worded differently.
const q = { ...p, 'roll number': '23711A3126', branch: 'AI', campus: 'NECN', 'b.tech percentage': '75' };
assert.equal(findKey('Roll No.', q), 'roll number');
assert.equal(findKey('Your Roll Number', q), 'roll number');
assert.equal(findKey('College Roll Number', q), 'roll number');
assert.equal(findKey('Branch / Branch of study', q), 'branch');
assert.equal(findKey('Percentage', q), 'b.tech percentage');
assert.equal(findKey('Campus', q), 'campus');
// A one-word learned key must not swallow a bigger question.
assert.equal(findKey('Are you interested in campus placement?', q), null);
assert.equal(findKey('College Name', q), 'college');

assert.ok(same(['B', 'a'], ['A', 'b ']));
assert.ok(!same('a', ['a', 'b']));
console.log('ok');
