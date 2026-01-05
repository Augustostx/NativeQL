import chalk from "chalk";
import figlet from "figlet";
import ora from "ora";
import gradient from "gradient-string";
import boxen from "boxen";

export const showBanner = () => {
    console.clear();
    const banner = figlet.textSync("NativeQL", {
        horizontalLayout: "full",
    });
    console.log(gradient.pastel.multiline(banner));

    console.log(boxen(chalk.cyan("The Ultimate React Native SQLite ORM"), {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "cyan",
        dimBorder: true
    }));
};

export const logSuccess = (message: string) => {
    console.log(chalk.green("✔ " + message));
};

export const logError = (message: string) => {
    console.log(chalk.red("✖ " + message));
};

export const logInfo = (message: string) => {
    console.log(chalk.blue("ℹ " + message));
};

export const withSpinner = async <T>(
    text: string,
    fn: () => Promise<T>
): Promise<T> => {
    const spinner = ora(text).start();
    try {
        const result = await fn();
        spinner.succeed(text); // Keep text on success for context
        return result;
    } catch (error) {
        spinner.fail(text + " (Failed)");
        throw error;
    }
};
