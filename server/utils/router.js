import { Router } from "express";
import {
  findTrainers,
  upsertTrainer,
   } from "~/server/utils/trainer";
import { findPokemon } from "~/server/utils/pokemon";

const router = Router();

router.get("/hello", (_req, res) => {
  res.send("Hello World");
});

/** トレーナー名の一覧の取得 */
router.get("/trainers", async (_req, res, next) => {
  try {
    const trainers = await findTrainers();
    const trainerNames = trainers.map(({ Key}) => Key.replace(/\.json$/, ""))
    res.send(trainerNames);
    // ! 期待するレスポンスボディに変更してみました。 2/6
    res.send(trainers);
  } catch (err) {
    next(err);
  }
});

/** トレーナーの追加をする処理 **/
router.post("/trainer", async (req, res, next) => {
  try {
    // ！リクエストボディにトレーナー名が含まれていなければ400を返します
    if (!("name" in req.body && req.body.name.length > 0))
      return res.sendStatus(400);

    const trainers = await findTrainers();
    // ! すでにトレーナー（S3 オブジェクト）が存在していれば409を返す
      if (trainers.some(( { Key }) => Key === `${req.body.name}.json`))
      return res.sendStatus(409);

    const result = await upsertTrainer(req.body.name, req.body);
    res.status(result["$metadata"].httpStatusCode).send(result);
  } catch (err) {
    next(err);
  }
});

/** トレーナーの取得をする処理 **/
// トレーナーを取得する API エンドポイントの実装します
// errorだったらerrを返します。
router.get("/tariner/:trainerName", async (req, res, next) => {
  try {
    const { trainerName } = req.params;
    const trainer = await findTrainers(trainerName);
    res.send(trainer);
  } catch (err) {
    next(err);
  }
});

/** トレーナーの更新 */
router.post("/trainer/:trainerName", async (req, res, next) => {
  try {
    const { trainerName } = req.params;
    const trainers = await findTrainers();
    // トレーナーが存在していなければ404を返す
    if (trainers.some(( { Key }) => Key === `${trainerName}.json`))
    return res.sendStatus(404);

    const result = await upsertTrainer(trainerName, req.body);
    res.status(result["$metadata"].httpStatusCode).send(result);
  } catch (err) {
    next(err);
  }
});

/** トレーナーの削除 */
// TODO: トレーナーを削除する API エンドポイントの実装

/** トレーナがゲットしたポケモンの追加 */
router.post("/trainer/:trainerName/pokemon", async (req, res, next) => {
  try {
    const { trainerName } = req.params;
    const trainer = await findTrainers(trainerName);
    // リクエストボディにポケモン名が含まれていなければ400を返す
      if (!("name" in req.body && req.body.name.length > 0 ))
      return res.sendStatus(400);

    const pokemon = await findPokemon(req.body.name);
    const {
      order,
      name,
      sprite: { front_default },
    } = pokemon;
    trainer.pokemons.push({
      id: (trainer.pokemons[trainer.pokemons.length - 1]?.id ?? 0) + 1,
      nickname: "",
      order,
      name,
      sprites: { front_default},
    });
    
    // TODO: 削除系 API エンドポイントを利用しないかぎりポケモンは保持する
    const result = await upsertTrainer(trainerName, { pokemons: [pokemon] });
    res.status(result["$metadata"].httpStatusCode).send(result);
  } catch (err) {
    next(err);
  }
});

/** ポケモンの削除 */
// TODO: ポケモンを削除する API エンドポイントの実装

export default router;
