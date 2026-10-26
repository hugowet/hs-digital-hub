import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clubPixBody,validPixCpf} from './club-pix';
test('Pix do Clube exige CPF válido',()=>{assert.equal(validPixCpf('11111111111'),false);assert.throws(()=>clubPixBody('id','test@example.com','123'));});
test('Pix é R$19,90 por um mês, sem application_fee',()=>{const body=clubPixBody('intent','test@example.com','52998224725');assert.equal(body.transaction_amount,19.9);assert.equal(body.payment_method_id,'pix');assert.equal(body.external_reference,'club-pix:intent');assert.equal('application_fee' in body,false);});