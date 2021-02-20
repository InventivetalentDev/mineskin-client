import * as chai from 'chai';
import { should as shld } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { MineSkinClient, SkinVariant, SkinVisibility } from "../src";

chai.use(chaiAsPromised);
const should = shld();


describe("Client", function () {
    let client: MineSkinClient;
    describe("init", function (){
        it("should create a new client",function (){
            client = new MineSkinClient({
                maxTries: 2,
                userAgent: "MineSkinClient/NodeJS/Test"
            });
        })
    })

    describe("get",function () {
        this.timeout(10000);
       describe("uuid", function () {
           it("should get skins by uuid", async function () {
               let skin = await client.getSkin("4dd8993d7368409bba7f81222940c78a");
               should.exist(skin);
               console.log(skin);

               skin!.uuid.should.eql("4dd8993d7368409bba7f81222940c78a");
               skin!.name.should.eql("inventivetalent");
               skin!.variant.should.eql(SkinVariant.CLASSIC);
               skin!.views.should.be.gte(2);
           })
       })
    })

    describe("generate", function () {
        this.timeout(20000);
        describe("user", function () {
            it("should generate from user", async function () {
                let skin = await client.generateUser("inventivetalent", {
                    visibility: SkinVisibility.PRIVATE,
                    name: "test-user"
                });
                should.exist(skin);
                console.log(skin);

                skin!.name.should.eql("test-user");
                skin!.private.should.be.true;
            })
        })
        /*
        describe("url", function () {
            it("should generate from url", async function (){
                //TODO
            })
        })
        describe("upload", function () {
            it("should generate from upload", async function () {
                //TODO
            })
        })
        */
    })
})
