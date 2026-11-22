const fs=require('fs'),assert=require('assert');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc,runTransaction,serverTimestamp}=require('firebase/firestore');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-pai-office',firestore:{rules:fs.readFileSync('panchayatai/firestore.rules','utf8')}});
 const owner=env.authenticatedContext('owner',{email:'owner@example.test',email_verified:true}).firestore();
 const other=env.authenticatedContext('other',{email:'other@example.test',email_verified:true}).firestore();
 const admin=env.authenticatedContext('admin',{email:'surajbhanpandey853@gmail.com',email_verified:true}).firestore();
 const image='data:image/jpeg;base64,/9j/2Q==',id='upi-123456789012';
 await env.withSecurityRulesDisabled(async c=>{for(const [uid,email] of [['owner','owner@example.test'],['other','other@example.test']])await setDoc(doc(c.firestore(),'users',uid),{uid,email,name:'Test',role:'resident'});});
 await assertSucceeds(runTransaction(owner,async tx=>{
   const ref=doc(owner,'users','owner');await tx.get(ref);
   tx.update(ref,{paymentProofs:{[id]:{image,planId:'monthly'}}});
   tx.set(doc(owner,'paiPayments',id),{uid:'owner',email:'owner@example.test',planId:'monthly',amount:49,coupon:'',utr:'123456789012',status:'pending',at:serverTimestamp()});
 }));
 await assertFails(getDoc(doc(other,'users','owner')));
 await assertFails(updateDoc(doc(owner,'users','owner'),{plan:{name:'Forged',until:Date.now()+86400000}}));
 await assertFails(updateDoc(doc(owner,'paiPayments',id),{status:'approved'}));
 await assertFails(setDoc(doc(other,'paiPayments',id),{uid:'other',email:'other@example.test',planId:'monthly',amount:49,coupon:'',utr:'123456789012',status:'pending',at:serverTimestamp()}));
 assert.equal((await getDoc(doc(admin,'users','owner'))).data().paymentProofs[id].image,image);
 await assertSucceeds(runTransaction(admin,async tx=>{
   const userRef=doc(admin,'users','owner'),paymentRef=doc(admin,'paiPayments',id);
   const user=await tx.get(userRef),payment=await tx.get(paymentRef);assert.equal(payment.data().status,'pending');
   tx.update(userRef,{plan:{name:'Plus',activationId:id,until:Date.now()+30*86400000},paymentProofs:{}});
   tx.update(paymentRef,{status:'approved',proof:user.data().paymentProofs[id].image});
 }));
 assert.equal((await getDoc(doc(owner,'users','owner'))).data().plan.activationId,id);
 assert.equal((await getDoc(doc(admin,'paiPayments',id))).data().proof,image);
 await env.cleanup();console.log('PASS: Private proof upload, no cross-user reading, no self-activation, no UTR replay, admin approval and receipt archive using existing rules.');
})().catch(e=>{console.error(e);process.exit(1);});